import React, { useState, useEffect } from 'react';

const NotionTaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [databaseId, setDatabaseId] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Add a new task
  const addTask = async () => {
    if (!newTask.trim()) return;
    
    setIsLoading(true);
    
    // In a real app, this would call the Notion API
    // For demo purposes, we'll just simulate adding to our local state
    const task = {
      id: Date.now().toString(),
      title: newTask,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    setTasks([task, ...tasks]);
    setNewTask('');
    setIsLoading(false);
    
    // This would be where you'd make the actual API call to Notion
    console.log('Added task to Notion:', task);
  };
  
  // Toggle task completion
  const toggleTask = (id) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
    
    // In a real app, this would update the task in Notion
    console.log('Updated task completion in Notion:', id);
  };
  
  // Delete a task
  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
    
    // In a real app, this would delete from Notion
    console.log('Deleted task from Notion:', id);
  };
  
  // Save configuration
  const saveConfig = () => {
    if (apiKey && databaseId) {
      setIsConfigured(true);
      // In a real app, store these securely
      console.log('Configuration saved');
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    addTask();
  };
  
  // Demo tasks for preview
  useEffect(() => {
    if (isConfigured) {
      setTasks([
        { id: '1', title: 'Finish math homework', completed: false, createdAt: new Date().toISOString() },
        { id: '2', title: 'Read chapter 5', completed: true, createdAt: new Date().toISOString() },
        { id: '3', title: 'Call doctor', completed: false, createdAt: new Date().toISOString() }
      ]);
    }
  }, [isConfigured]);

  if (!isConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Connect to Notion</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notion API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter your Notion API key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database ID</label>
              <input
                type="text"
                value={databaseId}
                onChange={(e) => setDatabaseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter your Notion database ID"
              />
            </div>
            <button
              onClick={saveConfig}
              className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-700"
            >
              Connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">My Tasks</h1>
        
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex items-center">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-grow px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a new task..."
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-blue-600 text-white font-medium py-2 px-4 rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            >
              {isLoading ? '...' : 'Add'}
            </button>
          </div>
        </form>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {tasks.length === 0 ? (
            <p className="text-center py-6 text-gray-500">No tasks yet. Add one above!</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {tasks.map((task) => (
                <li key={task.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          task.completed
                            ? 'bg-green-500 border-green-500 text-white'
                            : 'border-gray-300'
                        }`}
                      >
                        {task.completed && (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <span className={`${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        {task.title}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotionTaskManager;