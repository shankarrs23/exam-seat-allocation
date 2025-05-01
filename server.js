const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})

.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Models
const User = mongoose.model('User', {
    email: String,
    password: String,
    role: String
});

const Allocation = mongoose.model('Allocation', {
    adminName: String,
    classrooms: [{
        name: String,
        rows: Number,
        cols: Number,
        invigilator: String,
        students: [{
            name: String,
            rollNo: String,
            row: Number,
            col: Number,
            seatNumber: String
        }]
    }],
    date: { type: String, default: () => new Date().toLocaleString() }
});

const Student = mongoose.model('Student', {
    name: String,
    rollNo: String,
    classroom: String,
    row: Number,
    col: Number,
    seatNumber: String,
    invigilator: String,
    allocationId: mongoose.Schema.Types.ObjectId
});

// JWT Secret Key
const JWT_SECRET = 'secretkey';

// Routes

// Register a new user
app.post('/api/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({ email, password: hashedPassword, role });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Find user
        const user = await User.findOne({ email, role });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ token, role });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Middleware to verify admin token
const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// Create seat allocation (Admin only)
app.post('/api/allocations', verifyAdmin, async (req, res) => {
    try {
        const { adminName, classrooms } = req.body;

        // Create allocation with seat numbers
        const allocation = new Allocation({
            adminName,
            classrooms: classrooms.map(room => ({
                ...room,
                students: room.students.map(student => ({
                    ...student,
                    seatNumber: `r${student.row + 1}c${student.col + 1}`
                }))
            }))
        });
        await allocation.save();

        // Save students with seat numbers
        for (const room of classrooms) {
            for (const student of room.students) {
                const studentRecord = new Student({
                    name: student.name,
                    rollNo: student.rollNo,
                    classroom: room.name,
                    row: student.row,
                    col: student.col,
                    seatNumber: `r${student.row + 1}c${student.col + 1}`,
                    invigilator: room.invigilator,
                    allocationId: allocation._id
                });
                await studentRecord.save();
            }
        }

        res.status(201).json(allocation);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all allocations (Admin only)
app.get('/api/allocations', verifyAdmin, async (req, res) => {
    try {
        const allocations = await Allocation.find().sort({ date: -1 });
        res.json(allocations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Delete student from seat (Admin only)
app.delete('/api/allocations/:allocationId/students/:studentId', verifyAdmin, async (req, res) => {
    try {
        const { allocationId, studentId } = req.params;

        // Delete student from allocation
        const allocation = await Allocation.findById(allocationId);
        if (!allocation) {
            return res.status(404).json({ message: 'Allocation not found' });
        }

        // Find and remove student from all classrooms
        for (const room of allocation.classrooms) {
            const studentIndex = room.students.findIndex(s => s._id.toString() === studentId);
            if (studentIndex !== -1) {
                room.students.splice(studentIndex, 1);
                break;
            }
        }

        await allocation.save();

        // Delete student record
        await Student.findByIdAndDelete(studentId);

        res.json({ message: 'Student deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Replace student in seat (Admin only)
app.put('/api/allocations/:allocationId/students/:studentId', verifyAdmin, async (req, res) => {
    try {
        const { allocationId, studentId } = req.params;
        const { name, rollNo } = req.body;

        // Update student in allocation
        const allocation = await Allocation.findById(allocationId);
        if (!allocation) {
            return res.status(404).json({ message: 'Allocation not found' });
        }

        // Find and update student in all classrooms
        for (const room of allocation.classrooms) {
            const student = room.students.find(s => s._id.toString() === studentId);
            if (student) {
                student.name = name;
                student.rollNo = rollNo;
                break;
            }
        }

        await allocation.save();

        // Update student record
        await Student.findByIdAndUpdate(studentId, { name, rollNo });

        res.json({ message: 'Student replaced successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get student seat by roll number
app.get('/api/students/:rollNo', async (req, res) => {
    try {
        const student = await Student.findOne({ rollNo: req.params.rollNo });
        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Get allocation details
        const allocation = await Allocation.findById(student.allocationId);
        const room = allocation.classrooms.find(r => r.name === student.classroom);

        res.json({
            ...student.toObject(),
            invigilator: room.invigilator,
            allocationDate: allocation.date
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
