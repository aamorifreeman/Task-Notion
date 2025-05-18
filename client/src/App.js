import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001/api';

const NotionDatabaseManager = () => {
  const [items, setItems] = useState([]);
  const [newItemData, setNewItemData] = useState({});
  const [schema, setSchema] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch database schema
  const fetchSchema = async () => {
    try {
      const response = await fetch(`${API_URL}/schema`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setSchema(data);
      
      // Initialize new item data with empty values for each property
      const initialData = {};
      data.properties.forEach(prop => {
        initialData[prop.name] = '';
      });
      setNewItemData(initialData);
      
    } catch (err) {
      console.error('Failed to fetch schema:', err);
      setError('Failed to load database schema. Make sure your backend server is running.');
    }
  };

  // Fetch items from database
  const fetchItems = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/tasks`);
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const data = await response.json();
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setError('Failed to load items. Make sure your backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a new item
  const addItem = async () => {
    if (!schema || !schema.titleProperty) return;
    
    // Ensure title property is not empty
    if (!newItemData[schema.titleProperty]) {
      setError(`The ${schema.titleProperty} field is required`);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ properties: newItemData }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      const newItemResult = await response.json();
      setItems([newItemResult, ...items]);
      
      // Reset form
      const resetData = {};
      schema.properties.forEach(prop => {
        resetData[prop.name] = '';
      });
      setNewItemData(resetData);
      
    } catch (err) {
      console.error('Failed to add item:', err);
      setError('Failed to add item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Toggle item completion
  const toggleItemCompletion = async (id) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    // Optimistic update
    setItems(items.map(i => 
      i.id === id ? { ...i, completed: !i.completed } : i
    ));
    
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          properties: { completed: !item.completed }
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
        // Revert the optimistic update on error
        setItems(items);
      }
    } catch (err) {
      console.error('Failed to update item:', err);
      setError('Failed to update item status. Please try again.');
      // Revert the optimistic update on error
      setItems(items);
    }
  };
  
  // Delete an item
  const deleteItem = async (id) => {
    // Optimistic update
    const originalItems = [...items];
    setItems(items.filter(i => i.id !== id));
    
    try {
      const response = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError('Failed to delete item. Please try again.');
      // Revert the optimistic update on error
      setItems(originalItems);
    }
  };
  
  // Handle input change for new item
  const handleInputChange = (property, value) => {
    setNewItemData({
      ...newItemData,
      [property]: value
    });
  };
  
  // Handle key press for adding item
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      addItem();
    }
  };
  
  // Format date to readable format
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateStr;
    }
  };
  
  // Load schema and items on initial render
  useEffect(() => {
    fetchSchema().then(() => fetchItems());
  }, []);
  
  // Get property display name
  const getPropertyDisplayName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Determine if a property should be displayed in the table
  const shouldDisplayInTable = (property) => {
    // Skip very long text fields, URLs, etc.
    return property.type !== 'rich_text' || 
           property.name === schema?.titleProperty;
  };
  
  // Render property value
  const renderPropertyValue = (value, type) => {
    if (value === null || value === undefined) return '—';
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (type === 'date') {
      return formatDate(value);
    }
    
    if (type === 'checkbox') {
      return value ? '✓' : '—';
    }
    
    if (type === 'url') {
      return (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Link
        </a>
      );
    }
    
    return String(value);
  };
  
  // Render input for property
  const renderPropertyInput = (property) => {
    const { name, type, options } = property;
    
    switch (type) {
      case 'select':
      case 'status':
        return (
          <select
            value={newItemData[name] || ''}
            onChange={(e) => handleInputChange(name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select {getPropertyDisplayName(name)}</option>
            {options && options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <input
            type="checkbox"
            checked={Boolean(newItemData[name])}
            onChange={(e) => handleInputChange(name, e.target.checked)}
            className="h-5 w-5 rounded border-gray-300"
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={newItemData[name] || ''}
            onChange={(e) => handleInputChange(name, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        );
      
      case 'url':
        return (
          <input
            type="url"
            value={newItemData[name] || ''}
            onChange={(e) => handleInputChange(name, e.target.value)}
            placeholder={`Enter ${getPropertyDisplayName(name)}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={newItemData[name] || ''}
            onChange={(e) => handleInputChange(name, e.target.value)}
            placeholder={`Enter ${getPropertyDisplayName(name)}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        );
      
      default:
        return (
          <input
            type="text"
            value={newItemData[name] || ''}
            onChange={(e) => handleInputChange(name, e.target.value)}
            onKeyPress={name === schema?.titleProperty ? handleKeyPress : undefined}
            placeholder={`Enter ${getPropertyDisplayName(name)}`}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        );
    }
  };

  if (!schema) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading database schema...</p>
          {error && <p className="text-red-600 mt-2">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-6xl">
        <h1 className="text-2xl font-bold text-center mb-6">
          {schema.properties.find(p => p.name === schema.titleProperty)?.name || 'Notion Database'}
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <h2 className="text-lg font-medium mb-3">Add New Item</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schema.properties.map(property => (
              <div key={property.name} className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {getPropertyDisplayName(property.name)}
                  {property.name === schema.titleProperty && <span className="text-red-500">*</span>}
                </label>
                {renderPropertyInput(property)}
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={addItem}
              disabled={isLoading || !newItemData[schema.titleProperty]}
              className="bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {isLoading && items.length === 0 ? (
            <p className="text-center py-6 text-gray-500">Loading items...</p>
          ) : items.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No items yet. Add one above!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {schema.properties
                      .filter(shouldDisplayInTable)
                      .map(property => (
                        <th 
                          key={property.name}
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {getPropertyDisplayName(property.name)}
                        </th>
                      ))}
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleItemCompletion(item.id)}
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                            item.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {item.completed && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      </td>
                      
                      {schema.properties
                        .filter(shouldDisplayInTable)
                        .map(property => {
                          const value = item.properties[property.name];
                          const isTitleProperty = property.name === schema.titleProperty;
                          
                          return (
                            <td 
                              key={property.name}
                              className={`px-6 py-4 whitespace-nowrap ${isTitleProperty ? 'font-medium' : 'text-sm text-gray-500'}`}
                            >
                              <span className={item.completed && isTitleProperty ? 'line-through text-gray-500' : ''}>
                                {renderPropertyValue(value, property.type)}
                              </span>
                            </td>
                          );
                        })}
                      
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-center">
          <button 
            onClick={fetchItems}
            className="text-blue-600 hover:text-blue-800"
          >
            Refresh Items
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <NotionDatabaseManager />
    </div>
  );
}

export default App;