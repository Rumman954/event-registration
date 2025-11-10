const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./events.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    
    // Create events table
    db.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATETIME NOT NULL,
      location TEXT NOT NULL,
      max_capacity INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating events table:', err.message);
      } else {
        console.log('Events table ready');
      }
    });

    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('Users table ready');
      }
    });

    // Create registrations table
    db.run(`CREATE TABLE IF NOT EXISTS registrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'confirmed',
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (event_id) REFERENCES events(id),
      UNIQUE(user_id, event_id)
    )`, (err) => {
      if (err) {
        console.error('Error creating registrations table:', err.message);
      } else {
        console.log('Registrations table ready');
      }
    });
  }
});

// Helper function to get user by email or create new user
function getOrCreateUser(userData, callback) {
  db.get('SELECT * FROM users WHERE email = ?', [userData.email], (err, user) => {
    if (err) {
      return callback(err, null);
    }
    
    if (user) {
      return callback(null, user);
    }
    
    // Create new user
    db.run('INSERT INTO users (name, email, phone) VALUES (?, ?, ?)',
      [userData.name, userData.email, userData.phone || null],
      function(err) {
        if (err) {
          return callback(err, null);
        }
        db.get('SELECT * FROM users WHERE id = ?', [this.lastID], (err, newUser) => {
          callback(err, newUser);
        });
      });
  });
}

// API: Get all events
app.get('/api/events', (req, res) => {
  db.all(`SELECT 
    e.*, 
    COUNT(r.id) as registered_count,
    (e.max_capacity - COUNT(r.id)) as available_spots
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'confirmed'
    GROUP BY e.id
    ORDER BY e.event_date ASC`, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// API: Get event by ID
app.get('/api/events/:id', (req, res) => {
  const eventId = req.params.id;

  db.get(`SELECT 
    e.*, 
    COUNT(r.id) as registered_count,
    (e.max_capacity - COUNT(r.id)) as available_spots
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'confirmed'
    WHERE e.id = ?
    GROUP BY e.id`, [eventId], (err, event) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  });
});

// API: Create new event
app.post('/api/events', (req, res) => {
  const { title, description, event_date, location, max_capacity } = req.body;

  if (!title || !event_date || !location || !max_capacity) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run('INSERT INTO events (title, description, event_date, location, max_capacity) VALUES (?, ?, ?, ?, ?)',
    [title, description || null, event_date, location, max_capacity],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create event' });
      }
      
      db.get('SELECT * FROM events WHERE id = ?', [this.lastID], (err, event) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        res.status(201).json(event);
      });
    });
});

// API: Register for event
app.post('/api/events/:id/register', (req, res) => {
  const eventId = req.params.id;
  const { name, email, phone } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Check if event exists and has available spots
  db.get(`SELECT 
    e.*, 
    COUNT(r.id) as registered_count
    FROM events e
    LEFT JOIN registrations r ON e.id = r.event_id AND r.status = 'confirmed'
    WHERE e.id = ?
    GROUP BY e.id`, [eventId], (err, event) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (event.registered_count >= event.max_capacity) {
      return res.status(400).json({ error: 'Event is full' });
    }

    // Get or create user
    getOrCreateUser({ name, email, phone }, (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to create user' });
      }

      // Check if user is already registered
      db.get('SELECT * FROM registrations WHERE user_id = ? AND event_id = ?',
        [user.id, eventId], (err, existingRegistration) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (existingRegistration) {
          if (existingRegistration.status === 'cancelled') {
            // Reactivate registration
            db.run('UPDATE registrations SET status = ? WHERE id = ?',
              ['confirmed', existingRegistration.id],
              function(err) {
                if (err) {
                  return res.status(500).json({ error: 'Failed to register' });
                }
                res.json({ message: 'Registration confirmed', registration: existingRegistration });
              });
          } else {
            return res.status(400).json({ error: 'Already registered for this event' });
          }
        } else {
          // Create new registration
          db.run('INSERT INTO registrations (user_id, event_id, status) VALUES (?, ?, ?)',
            [user.id, eventId, 'confirmed'],
            function(err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to register' });
              }
              
              db.get('SELECT * FROM registrations WHERE id = ?', [this.lastID], (err, registration) => {
                if (err) {
                  return res.status(500).json({ error: 'Database error' });
                }
                res.status(201).json({ 
                  message: 'Registration successful', 
                  registration: registration,
                  user: user,
                  event: event
                });
              });
            });
        }
      });
    });
  });
});

// API: Get user registrations
app.get('/api/users/:email/registrations', (req, res) => {
  const email = req.params.email;

  db.all(`SELECT 
    r.*,
    e.title as event_title,
    e.description as event_description,
    e.event_date,
    e.location,
    u.name as user_name,
    u.email as user_email
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    JOIN users u ON r.user_id = u.id
    WHERE u.email = ?
    ORDER BY r.registration_date DESC`, [email], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// API: Cancel registration
app.delete('/api/registrations/:id', (req, res) => {
  const registrationId = req.params.id;

  db.run('UPDATE registrations SET status = ? WHERE id = ?',
    ['cancelled', registrationId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Registration not found' });
      }

      res.json({ message: 'Registration cancelled successfully' });
    });
});

// API: Get registration by ID
app.get('/api/registrations/:id', (req, res) => {
  const registrationId = req.params.id;

  db.get(`SELECT 
    r.*,
    e.title as event_title,
    e.description as event_description,
    e.event_date,
    e.location,
    u.name as user_name,
    u.email as user_email,
    u.phone as user_phone
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    JOIN users u ON r.user_id = u.id
    WHERE r.id = ?`, [registrationId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    res.json(row);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Event Registration server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed');
    process.exit(0);
  });
});

