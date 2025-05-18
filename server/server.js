// server.js - Universal Notion Database Adapter
const express = require('express');
const cors = require('cors');
const { Client } = require('@notionhq/client');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY
});

const databaseId = process.env.NOTION_DATABASE_ID;
// Cache for database schema
let databaseSchema = null;

// Get database schema and cache it
async function getDatabaseSchema() {
  if (databaseSchema) return databaseSchema;
  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    databaseSchema = {
      properties: database.properties,
      titleProperty: Object.entries(database.properties).find(([, prop]) => prop.type === 'title')?.[0],
      checkboxProperties: Object.entries(database.properties)
        .filter(([, prop]) => prop.type === 'checkbox' || prop.type === 'status')
        .map(([key]) => key),
      dateProperties: Object.entries(database.properties)
        .filter(([, prop]) => prop.type === 'date')
        .map(([key]) => key),
      selectProperties: Object.entries(database.properties)
        .filter(([, prop]) => prop.type === 'select' || prop.type === 'multi_select')
        .map(([key]) => key),
      textProperties: Object.entries(database.properties)
        .filter(([, prop]) => prop.type === 'rich_text')
        .map(([key]) => key),
      urlProperties: Object.entries(database.properties)
        .filter(([, prop]) => prop.type === 'url')
        .map(([key]) => key),
      numberProperties: Object.entries(database.properties)
        .filter(([, prop]) => prop.type === 'number')
        .map(([key]) => key)
    };
    return databaseSchema;
  } catch (error) {
    console.error('Error fetching database schema:', error);
    throw error;
  }
}

// Extract value from any Notion property
function extractPropertyValue(property) {
  if (!property) return null;
  switch (property.type) {
    case 'title':
      return property.title.map(t => t.plain_text).join('');
    case 'rich_text':
      return property.rich_text.map(t => t.plain_text).join('');
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select.map(s => s.name);
    case 'checkbox':
      return property.checkbox;
    case 'date':
      return property.date?.start || null;
    case 'url':
      return property.url;
    case 'number':
      return property.number;
    case 'status':
      return property.status?.name || null;
    default:
      return null;
  }
}

// Set property value with correct type
function setPropertyValue(propertyName, propertySchema, value) {
  if (value === undefined || value === null) return null;
  switch (propertySchema.type) {
    case 'title':
      return { title: [{ text: { content: String(value) } }] };
    case 'rich_text':
      return { rich_text: [{ text: { content: String(value) } }] };
    case 'select':
      return { select: { name: String(value) } };
    case 'multi_select':
      return { multi_select: Array.isArray(value) ? value.map(v => ({ name: String(v) })) : [{ name: String(value) }] };
    case 'checkbox':
      return { checkbox: Boolean(value) };
    case 'date':
      return { date: { start: value } };
    case 'url':
      return { url: String(value) };
    case 'number':
      return { number: Number(value) };
    case 'status': {
      const options = propertySchema.status.options || [];
      const match = options.find(opt => opt.name.toLowerCase() === String(value).toLowerCase());
      const name = match ? match.name : options[0]?.name || String(value);
      return { status: { name } };
    }
    default:
      return null;
  }
}

// GET /api/schema
app.get('/api/schema', async (req, res) => {
  try {
    const schema = await getDatabaseSchema();
    res.json({
      titleProperty: schema.titleProperty,
      properties: Object.entries(schema.properties).map(([key, prop]) => ({
        name: key,
        type: prop.type,
        options: ['select', 'multi_select', 'status'].includes(prop.type) ? (prop[prop.type]?.options || []).map(opt => opt.name) : null
      }))
    });
  } catch (error) {
    console.error('Error fetching schema:', error);
    res.status(500).json({ error: 'Failed to fetch database schema' });
  }
});

// GET /api/tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const schema = await getDatabaseSchema();
    const sorts = [ { property: 'Due', direction: 'ascending' } ];
    const response = await notion.databases.query({ database_id: databaseId, sorts });
    const items = response.results.map(page => {
      const result = { id: page.id, createdAt: page.created_time, properties: {} };
      Object.entries(page.properties).forEach(([key, prop]) => { result.properties[key] = extractPropertyValue(prop); });
      if (schema.titleProperty) result.title = result.properties[schema.titleProperty] || 'Untitled';
      const checkboxProp = schema.checkboxProperties[0];
      if (checkboxProp) {
        const val = result.properties[checkboxProp];
        result.completed = typeof val === 'boolean' ? val : (typeof val === 'string' ? ['done','complete','completed'].includes(val.toLowerCase()) : false);
      }
      return result;
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch items from database' });
  }
});

// POST /api/tasks
app.post('/api/tasks', async (req, res) => {
    try {
      const schema = await getDatabaseSchema();
      if (!schema.titleProperty) return res.status(400).json({ error: 'Database must have a title property' });
      
      const { properties } = req.body;
      if (!properties || typeof properties !== 'object') 
        return res.status(400).json({ error: 'Properties object is required' });
      
      // Only require the title property to be filled
      if (!properties[schema.titleProperty]) 
        return res.status(400).json({ error: `Title property "${schema.titleProperty}" is required` });
      
      // Build Notion properties object with only the provided values
      const notionProps = {};
      Object.entries(properties).forEach(([key, value]) => {
        // Skip empty string values except for title
        if (value === '' && key !== schema.titleProperty) return;
        
        const propSchema = schema.properties[key];
        if (propSchema) {
          const formatted = setPropertyValue(key, propSchema, value);
          if (formatted) notionProps[key] = formatted;
        }
      });
      
      const response = await notion.pages.create({ 
        parent: { database_id: databaseId }, 
        properties: notionProps 
      });
      
      res.status(201).json({ 
        id: response.id, 
        title: properties[schema.titleProperty], 
        createdAt: response.created_time, 
        properties 
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Failed to create item in database' });
    }
  });

// PATCH /api/tasks/:id
app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { properties } = req.body;
    if (!properties || typeof properties !== 'object') return res.status(400).json({ error: 'Properties object is required' });
    const schema = await getDatabaseSchema();
    const notionProps = {};
    Object.entries(properties).forEach(([key, value]) => {
      const propSchema = schema.properties[key];
      const formatted = propSchema && setPropertyValue(key, propSchema, value);
      if (formatted) notionProps[key] = formatted;
    });
    if ('completed' in properties && schema.checkboxProperties.length) {
      const cb = schema.checkboxProperties[0];
      const ps = schema.properties[cb];
      if (ps.type === 'checkbox') notionProps[cb] = { checkbox: Boolean(properties.completed) }; 
      else if (ps.type === 'status') {
        const opts = ps.status.options || [];
        const done = opts.filter(o => ['done','complete','completed'].includes(o.name.toLowerCase()));
        const notDone = opts.filter(o => !['done','complete','completed'].includes(o.name.toLowerCase()));
        notionProps[cb] = { status: { name: properties.completed && done.length ? done[0].name : (notDone[0]?.name || done[0].name) } };
      }
    }
    await notion.pages.update({ page_id: id, properties: notionProps });
    res.json({ id, updated: true, properties });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update item in database' });
  }
});

// DELETE /api/tasks/:id
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await notion.pages.update({ page_id: id, archived: true });
    res.json({ id, deleted: true });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete item from database' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Using database: ${databaseId}`);
});
