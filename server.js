const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

app.use(express.json());
// Serve the index.html and static files from the current directory
app.use(express.static(__dirname));

const DATA_FILE = path.join(__dirname, 'tasks.json');

// Helper functions to read/write tasks to a file
function getTasks() {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveTasks(tasks) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2));
}

// Get all tasks
app.get('/tasks', (req, res) => {
    res.json(getTasks());
});

// Add a new task
app.post('/tasks', (req, res) => {
    const { name, notes, date, time, isRecurring, recurringDays, category, priority } = req.body;
    const tasks = getTasks();
    const newTask = {
        id: Date.now(),
        name,
        notes: notes || '',
        date: date || '',
        time,
        isDone: false,
        category: category || 'Uncategorized',
        priority: priority || 'Medium',
        isActive: true,
        isRecurring: isRecurring || false,
        recurringDays: recurringDays || [],
        snoozeUntil: 0,
        lastNotified: 0,
        lastCompletedDate: null
    };
    tasks.push(newTask);
    saveTasks(tasks);
    res.status(201).json(newTask);
});

// Mark a task as done
app.put('/tasks/:id/done', (req, res) => {
    const id = parseInt(req.params.id);
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.isDone = true;
        saveTasks(tasks);
        res.json(task);
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// Bulk mark tasks as done
app.put('/tasks/bulk-done', (req, res) => {
    const { ids, lastCompletedDate } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid data' });
    
    let tasks = getTasks();
    let changed = false;
    tasks.forEach(t => {
        if (ids.includes(t.id)) {
            t.isDone = true;
            if (lastCompletedDate) t.lastCompletedDate = lastCompletedDate;
            changed = true;
        }
    });
    if (changed) saveTasks(tasks);
    res.status(200).json({ message: 'Tasks updated' });
});

// Bulk delete tasks
app.delete('/tasks/bulk-delete', (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'Invalid data' });
    let tasks = getTasks();
    tasks = tasks.filter(t => !ids.includes(t.id));
    saveTasks(tasks);
    res.status(204).send();
});

// Update the last notified time (so the server knows when you were last nagged)
app.put('/tasks/:id/notified', (req, res) => {
    const id = parseInt(req.params.id);
    const { lastNotified } = req.body;
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.lastNotified = lastNotified;
        saveTasks(tasks);
        res.json(task);
    } else {
        res.status(404).send('Not found');
    }
});

// Update a task's time or name
app.put('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, notes, date, time, isActive, snoozeUntil, isDone, lastCompletedDate, isRecurring, recurringDays, category, priority } = req.body;
    const tasks = getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        if (name) task.name = name;
        if (notes !== undefined) task.notes = notes;
        if (date !== undefined) task.date = date;
        if (time) task.time = time;
        if (isActive !== undefined) task.isActive = isActive;
        if (snoozeUntil !== undefined) task.snoozeUntil = snoozeUntil;
        if (isDone !== undefined) task.isDone = isDone;
        if (lastCompletedDate !== undefined) task.lastCompletedDate = lastCompletedDate;
        if (isRecurring !== undefined) task.isRecurring = isRecurring;
        if (recurringDays !== undefined) task.recurringDays = recurringDays;
        if (category !== undefined) task.category = category;
        if (priority !== undefined) task.priority = priority;
        if (name || time) task.lastNotified = 0; // Reset so the alarm can trigger again for the new time
        saveTasks(tasks);
        res.json(task);
    } else {
        res.status(404).json({ error: 'Task not found' });
    }
});

// Clear all done tasks
app.delete('/tasks/done', (req, res) => {
    let tasks = getTasks();
    tasks = tasks.filter(t => !(t.isDone && !t.isRecurring)); // Keep recurring tasks!
    saveTasks(tasks);
    res.status(204).send();
});

// Delete a task
app.delete('/tasks/:id', (req, res) => {
    const id = parseInt(req.params.id);
    let tasks = getTasks();
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
    res.status(204).send();
});

// Import tasks
app.post('/tasks/import', (req, res) => {
    const importedTasks = req.body;
    if (!Array.isArray(importedTasks)) {
        return res.status(400).json({ error: 'Invalid data format' });
    }
    let tasks = getTasks();
    
    importedTasks.forEach(importedTask => {
        const existingIndex = tasks.findIndex(t => t.id === importedTask.id);
        if (existingIndex >= 0) {
            tasks[existingIndex] = importedTask;
        } else {
            tasks.push(importedTask);
        }
    });
    
    saveTasks(tasks);
    res.status(200).json({ message: 'Import successful' });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});