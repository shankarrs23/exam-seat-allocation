// Global variables
const BASE_URL = "https://exam-seat-backend.onrender.com";
let currentUser = null;
let allocations = [];
let currentAllocation = null;
let recentActivities = []; // Array to store recent activities

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI
    updateUIForUser();
    
    // Navigation
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const pageId = this.getAttribute('data-page');
            showPage(pageId);
        });
    });

    // Mobile menu toggle
    document.getElementById('hamburger').addEventListener('click', function() {
        document.getElementById('mobile-menu').classList.toggle('active');
    });

    // Show signup/login link
    document.getElementById('show-signup').addEventListener('click', function(e) {
        e.preventDefault();
        showPage('signup');
    });

    document.getElementById('show-login').addEventListener('click', function(e) {
        e.preventDefault();
        showPage('login');
    });

    // Logout buttons
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('mobile-logout-btn').addEventListener('click', logout);

    // Home page buttons
    document.getElementById('home-allocate-btn').addEventListener('click', function() {
        if (currentUser && currentUser.role === 'admin') {
            showPage('allocate');
        } else {
            showPage('login');
        }
    });

    document.getElementById('home-view-seat-btn').addEventListener('click', function() {
        if (currentUser && currentUser.role === 'student') {
            showPage('view-seat');
        } else {
            showPage('login');
        }
    });

// ✅ Real login using backend API
fetch(`${BASE_URL}/api/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, role })
})
.then(res => res.json())
.then(data => {
  if (data.token) {
    localStorage.setItem("token", data.token);
    currentUser = { email, role };
    updateUIForUser();
    showPage("home");
    showToast("Login successful!");
    updateHomeStats();
  } else {
    showToast(data.message || "Login failed", "error");
  }
})
.catch(() => {
  showToast("Login error", "error");
});


// ✅ Real signup using backend API
fetch(`${BASE_URL}/api/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password, role })
})
.then(res => res.json())
.then(data => {
  if (data.message === "User registered successfully") {
    showToast("Signup successful! Please login.");
    setTimeout(() => showPage("login"), 1500);
  } else {
    showToast(data.message || "Signup failed", "error");
  }
})
.catch(() => {
  showToast("Signup error", "error");
});


    // Password strength indicator
    document.getElementById('signup-password').addEventListener('input', function() {
        updatePasswordStrength(this.value);
    });

    // Allocation form
    document.getElementById('add-room-btn').addEventListener('click', addRoomInput);
    document.getElementById('allocation-form').addEventListener('submit', handleAllocation);

    // Edit controls
    document.getElementById('delete-btn').addEventListener('click', deleteStudent);
    document.getElementById('replace-btn').addEventListener('click', showReplaceForm);
    document.getElementById('confirm-replace-btn').addEventListener('click', replaceStudent);

    // Find seat form
    document.getElementById('find-seat-form').addEventListener('submit', function(e) {
        e.preventDefault();
        const rollNo = document.getElementById('roll-no').value;
        findStudentSeat(rollNo);
    });

    // Download Excel button
    document.getElementById('download-excel').addEventListener('click', downloadAsExcel);

    // Print button
    document.getElementById('print-results').addEventListener('click', function() {
        window.print();
    });

    // Student input counter
    document.getElementById('students-input').addEventListener('input', function() {
        updateStudentCount(this.value);
    });

    // Initialize with home page
    showPage('home');
    updateHomeStats();
});

// Show specific page
function showPage(pageId) {
    // Close mobile menu if open
    document.getElementById('mobile-menu').classList.remove('active');
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${pageId}-page`).classList.add('active');
    
    // Update active nav link
    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        }
    });

    // Reset forms when showing certain pages
    if (pageId === 'login') {
        document.getElementById('login-form').reset();
        document.getElementById('login-message').textContent = '';
    } else if (pageId === 'signup') {
        document.getElementById('signup-form').reset();
        document.getElementById('signup-message').textContent = '';
    } else if (pageId === 'allocate') {
        document.getElementById('replace-form').style.display = 'none';
    } else if (pageId === 'view-seats' && currentAllocation) {
        updateResultsSummary();
    }
}

// Update UI based on user role
function updateUIForUser() {
    const allocateLink = document.getElementById('allocate-link');
    const viewSeatsLink = document.getElementById('view-seats-link');
    const mobileAllocateLink = document.getElementById('mobile-allocate-link');
    const mobileViewSeatsLink = document.getElementById('mobile-view-seats-link');
    const userInfo = document.getElementById('user-info');
    const mobileUserInfo = document.getElementById('mobile-user-info');
    const userEmail = document.getElementById('user-email');
    const mobileUserEmail = document.getElementById('mobile-user-email');
    
    if (currentUser) {
        userInfo.style.display = 'flex';
        mobileUserInfo.style.display = 'block';
        userEmail.textContent = currentUser.email;
        mobileUserEmail.textContent = currentUser.email;
        
        if (currentUser.role === 'admin') {
            allocateLink.style.display = 'flex';
            viewSeatsLink.style.display = 'flex';
            mobileAllocateLink.style.display = 'flex';
            mobileViewSeatsLink.style.display = 'flex';
        } else {
            allocateLink.style.display = 'none';
            viewSeatsLink.style.display = 'none';
            mobileAllocateLink.style.display = 'none';
            mobileViewSeatsLink.style.display = 'none';
        }
    } else {
        userInfo.style.display = 'none';
        mobileUserInfo.style.display = 'none';
        allocateLink.style.display = 'none';
        viewSeatsLink.style.display = 'none';
        mobileAllocateLink.style.display = 'none';
        mobileViewSeatsLink.style.display = 'none';
    }
}

// Logout function
function logout() {
    currentUser = null;
    showToast('Logged out successfully');
    updateUIForUser();
    showPage('home');
}

// Add room input
function addRoomInput() {
    const roomCount = document.querySelectorAll('.room-config').length + 1;
    const roomDiv = document.createElement('div');
    roomDiv.className = 'form-group';
    roomDiv.innerHTML = `
        <label>Classroom ${roomCount}</label>
        <div class="room-config">
            <div class="input-with-icon">
                <input type="text" placeholder="Room Name" class="room-name" required>
                <i class="fas fa-door-closed"></i>
            </div>
            <div class="input-with-icon">
                <input type="number" placeholder="Rows" class="room-rows" required min="1">
                <i class="fas fa-grip-lines"></i>
            </div>
            <div class="input-with-icon">
                <input type="number" placeholder="Columns" class="room-cols" required min="1">
                <i class="fas fa-grip-lines-vertical"></i>
            </div>
            <div class="input-with-icon">
                <input type="text" placeholder="Invigilator (Name-ID)" class="room-invigilator" required>
                <i class="fas fa-user-shield"></i>
            </div>
        </div>
    `;
    document.getElementById('additional-rooms').appendChild(roomDiv);
}

// Handle allocation form submission
function handleAllocation(e) {
    e.preventDefault();
    showLoading(); // Show loading overlay
    
    // Get admin name
    const adminName = document.getElementById('admin-name').value;
    
    // Get classrooms
    const classrooms = [];
    document.querySelectorAll('.room-config').forEach(room => {
        classrooms.push({
            name: room.querySelector('.room-name').value,
            rows: parseInt(room.querySelector('.room-rows').value),
            cols: parseInt(room.querySelector('.room-cols').value),
            invigilator: room.querySelector('.room-invigilator').value,
            students: []
        });
    });
    
    // Get students from textarea using the parseStudents function
    const studentsText = document.getElementById('students-input').value;
    const studentEntries = parseStudents(studentsText);
    
    // Simple validation
    if (!adminName || classrooms.length === 0 || studentEntries.length === 0) {
        hideLoading();
        showToast('Please fill all fields', 'error');
        return;
    }
    
    // Send allocation to backend
    fetch(`${BASE_URL}/api/allocations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ adminName, classrooms })
    })
    .then(res => res.json())
    .then(data => {
        currentAllocation = data;
        displayAllocationResults(data);
        setupEditControls(data);
        enableEditControls(true);
        hideLoading();
        showToast("Seats allocated successfully!");
        showPage("view-seats");
    })
    .catch(err => {
        console.error(err);
        hideLoading();
        showToast("Allocation failed", "error");
    });
}
// Enable/disable edit controls
function enableEditControls(enabled) {
    document.getElementById('edit-room-select').disabled = !enabled;
    document.getElementById('edit-seat-select').disabled = !enabled;
    document.getElementById('delete-btn').disabled = !enabled;
    document.getElementById('replace-btn').disabled = !enabled;
    document.getElementById('new-student').disabled = !enabled;
    document.getElementById('confirm-replace-btn').disabled = !enabled;
}

// Display allocation results
function displayAllocationResults(allocation) {
    const resultsContainer = document.getElementById('allocation-results');
    resultsContainer.innerHTML = '';
    
    // Create classroom divs for each classroom
    allocation.classrooms.forEach((classroom, classroomIndex) => {
        const classroomDiv = document.createElement('div');
        classroomDiv.className = 'classroom';
        
        classroomDiv.innerHTML = `
            <h3><i class="fas fa-door-open"></i> ${classroom.name}</h3>
            <div class="invigilator">
                <i class="fas fa-user-shield"></i> Invigilator: ${classroom.invigilator}
            </div>
        `;
        
        // Create seat grid
        const seatGrid = document.createElement('div');
        seatGrid.className = 'seat-grid';
        // Set columns explicitly based on classroom configuration
        seatGrid.style.gridTemplateColumns = `repeat(${classroom.cols}, 1fr)`;
        
        // Add seats - maintaining the exact row/column structure
        for (let row = 0; row < classroom.rows; row++) {
            for (let col = 0; col < classroom.cols; col++) {
                const seatDiv = document.createElement('div');
                seatDiv.className = 'seat';
                
                // Find student for this seat
                const student = classroom.students.find(s => s.row === row && s.col === col);
                
                if (student) {
                    seatDiv.className += ' occupied';
                    seatDiv.innerHTML = `
                        <div class="student-name">${student.name}</div>
                        <div class="student-roll">${student.rollNo}</div>
                        <span class="seat-number">R${row+1}C${col+1}</span>
                    `;
                } else {
                    seatDiv.innerHTML = `
                        <div class="empty-label">Empty</div>
                        <span class="seat-number">R${row+1}C${col+1}</span>
                    `;
                }
                
                seatGrid.appendChild(seatDiv);
            }
        }
        
        classroomDiv.appendChild(seatGrid);
        resultsContainer.appendChild(classroomDiv);
    });
    
    // Display summary statistics
    updateResultsSummary(allocation);
    
    // Calculate room utilization
    calculateRoomUtilization();
    
    // Show view seats page
    showPage('view-seats');
}

// Setup edit controls
function setupEditControls(allocation) {
    const roomSelect = document.getElementById('edit-room-select');
    roomSelect.innerHTML = '';
    
    allocation.classrooms.forEach((room, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = room.name;
        roomSelect.appendChild(option);
    });
    
    roomSelect.addEventListener('change', function() {
        updateSeatSelect(allocation, this.value);
    });
    
    // Initialize with first room
    if (allocation.classrooms.length > 0) {
        updateSeatSelect(allocation, 0);
    }
}

// Update seat select dropdown (modified to show student names)
function updateSeatSelect(allocation, roomIndex) {
    const seatSelect = document.getElementById('edit-seat-select');
    seatSelect.innerHTML = '';
    
    const room = allocation.classrooms[roomIndex];
    const studentDetails = document.getElementById('student-details');
    
    seatSelect.addEventListener('change', function() {
        const seatValue = this.value;
        if (seatValue === '') {
            studentDetails.style.display = 'none';
            return;
        }
        
        const [row, col] = seatValue.split('-').map(Number);
        const student = room.students.find(s => s.row === row && s.col === col);
        
        if (student) {
            document.getElementById('current-student').textContent = 
                `${student.name} (${student.rollNo}) - Seat ${student.seatNumber}`;
            studentDetails.style.display = 'block';
        } else {
            document.getElementById('current-student').textContent = 'Empty seat';
            studentDetails.style.display = 'block';
        }
    });
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = 'Select a seat';
    seatSelect.appendChild(emptyOption);
    
    // Add all seats with student names if occupied
    for (let row = 0; row < room.rows; row++) {
        for (let col = 0; col < room.cols; col++) {
            const option = document.createElement('option');
            option.value = `${row}-${col}`;
            
            // Find student for this seat
            const student = room.students.find(s => s.row === row && s.col === col);
            if (student) {
                option.textContent = `${student.name} (${student.rollNo}) - Seat r${row+1}c${col+1}`;
            } else {
                option.textContent = `Empty Seat - r${row+1}c${col+1}`;
            }
            
            seatSelect.appendChild(option);
        }
    }
}

// Delete student from seat
function deleteStudent() {
    const roomSelect = document.getElementById('edit-room-select');
    const seatSelect = document.getElementById('edit-seat-select');
    
    if (!roomSelect.value || !seatSelect.value) {
        showToast('Please select a room and seat', 'error');
        return;
    }
    
    const [row, col] = seatSelect.value.split('-').map(Number);
    const room = currentAllocation.classrooms[roomSelect.value];
    
    // Find and remove student
    const studentIndex = room.students.findIndex(s => s.row === row && s.col === col);
    if (studentIndex !== -1) {
        room.students.splice(studentIndex, 1);
    }
    
    // Refresh display
    displayAllocationResults(currentAllocation);
    updateSeatSelect(currentAllocation, roomSelect.value);
    updateResultsSummary();
    showToast('Student deleted from seat');
}

// Show replace form
function showReplaceForm() {
    const roomSelect = document.getElementById('edit-room-select');
    const seatSelect = document.getElementById('edit-seat-select');
    
    if (!roomSelect.value || !seatSelect.value) {
        showToast('Please select a room and seat', 'error');
        return;
    }
    
    document.getElementById('replace-form').style.display = 'block';
}

// Replace student in seat
function replaceStudent() {
    const roomSelect = document.getElementById('edit-room-select');
    const seatSelect = document.getElementById('edit-seat-select');
    const newStudentInput = document.getElementById('new-student').value;
    
    if (!roomSelect.value || !seatSelect.value || !newStudentInput) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    // Validate student format
    if (!newStudentInput.includes('-')) {
        showToast('Invalid student format. Use Name-RollNo', 'error');
        return;
    }
    
    const [row, col] = seatSelect.value.split('-').map(Number);
    const room = currentAllocation.classrooms[roomSelect.value];
    const [name, rollNo] = newStudentInput.split('-');
    
    // Remove existing student if any
    const studentIndex = room.students.findIndex(s => s.row === row && s.col === col);
    if (studentIndex !== -1) {
        room.students.splice(studentIndex, 1);
    }
    
    // Add new student
    room.students.push({
        name: name || 'Unknown',
        rollNo: rollNo || 'N/A',
        row,
        col,
        seatNumber: `r${row+1}c${col+1}`
    });
    
    // Refresh display
    displayAllocationResults(currentAllocation);
    updateSeatSelect(currentAllocation, roomSelect.value);
    document.getElementById('replace-form').style.display = 'none';
    document.getElementById('new-student').value = '';
    updateResultsSummary();
    showToast('Student replaced successfully');
}

// Parse students from textarea
function parseStudents(studentText) {
    if (!studentText.trim()) return [];
    
    return studentText.split(',')
        .map(s => s.trim())
        .filter(s => s && s.includes('-'));
}

// Update student count
function updateStudentCount(studentText) {
    const students = parseStudents(studentText);
    document.getElementById('student-count').textContent = students.length;
}

// Find student seat with visualization
function findStudentSeat(rollNo) {
    if (!rollNo) {
        showToast('Please enter a roll number', 'error');
        return;
    }
    
    // Normalize roll number for case-insensitive search
    const normalizedRollNo = rollNo.trim().toLowerCase();

    // Search for the student in the current allocation
    let foundStudent = null;
    let foundRoom = null;
    
    if (allocations.length === 0) {
        // Generate mock data for demonstration if no allocations exist
        const mockData = generateMockAllocation(normalizedRollNo);
        foundStudent = mockData.student;
        foundRoom = mockData.room;
    } else {
        // Search through existing allocations
        for (const allocation of allocations) {
            for (const room of allocation.classrooms) {
                const student = room.students.find(s => s.rollNo.toLowerCase() === normalizedRollNo);
                if (student) {
                    foundStudent = student;
                    foundRoom = room;
                    break;
                }
            }
            if (foundStudent) break;
        }
    }

    const resultDiv = document.getElementById('seat-result');
    const visualizationDiv = document.getElementById('classroom-visualization');
    const neighborsDiv = document.getElementById('seat-neighbors');
    
    if (foundStudent) {
        // Display basic seat information
        resultDiv.innerHTML = `
            <div class="seat-details">
                <h3><i class="fas fa-user-graduate"></i> Exam Seat Details</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <span class="detail-label">Name:</span>
                        <span class="detail-value">${foundStudent.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Roll No:</span>
                        <span class="detail-value">${foundStudent.rollNo}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Classroom:</span>
                        <span class="detail-value">${foundRoom.name}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Seat Position:</span>
                        <span class="detail-value">Row ${foundStudent.row + 1}, Column ${foundStudent.col + 1}</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Invigilator:</span>
                        <span class="detail-value">${foundRoom.invigilator}</span>
                    </div>
                </div>
            </div>
        `;
        
        // Create classroom visualization
        renderClassroomVisualization(foundStudent, foundRoom);
        visualizationDiv.classList.add('active');
        
        // Create neighbors visualization
        renderSeatNeighbors(foundStudent, foundRoom);
        neighborsDiv.classList.add('active');
        
        // Add activity for tracking
        addActivity('Seat Found', `Seat found for student ${foundStudent.name} (${foundStudent.rollNo})`, 'fas fa-search');
    } else {
        resultDiv.innerHTML = `
            <div class="not-found">
                <i class="fas fa-exclamation-circle"></i>
                <p>No seat found for roll number: ${rollNo}</p>
                <p>Please check the roll number and try again.</p>
            </div>
        `;
        visualizationDiv.classList.remove('active');
        neighborsDiv.classList.remove('active');
    }
}

// Generate mock data for demonstration
function generateMockAllocation(searchRollNo) {
    const NAMES = ['John Smith', 'Emma Johnson', 'Michael Brown', 'Sophia Davis', 'William Wilson', 
                  'Olivia Taylor', 'James Miller', 'Ava Anderson', 'Benjamin Thomas', 'Isabella Moore'];
    const ROLL_PREFIXES = ['22UIT', '22UCE', '22UCT', '22UME'];
    
    // Generate mock room data
    const mockRoom = {
        name: 'Room 101',
        rows: 5,
        cols: 6,
        invigilator: 'Prof. Kumar (FAC001)',
        students: []
    };
    
    // Create a found student with the searched roll number
    const foundStudent = {
        name: NAMES[Math.floor(Math.random() * NAMES.length)],
        rollNo: searchRollNo.toUpperCase(),
        row: 2,  // Place in middle row
        col: 3   // Place in middle column
    };
    
    // Add the found student and other random students
    mockRoom.students.push(foundStudent);
    
    // Generate other students
    for (let i = 0; i < 20; i++) {
        const row = Math.floor(Math.random() * mockRoom.rows);
        const col = Math.floor(Math.random() * mockRoom.cols);
        
        // Skip if this is the same position as found student or already occupied
        if ((row === foundStudent.row && col === foundStudent.col) || 
            mockRoom.students.some(s => s.row === row && s.col === col)) {
            continue;
        }
        
        // Generate random roll number
        const prefix = ROLL_PREFIXES[Math.floor(Math.random() * ROLL_PREFIXES.length)];
        const suffix = Math.floor(Math.random() * 200).toString().padStart(3, '0');
        const rollNo = prefix + suffix;
        
        // Generate random name
        const name = NAMES[Math.floor(Math.random() * NAMES.length)];
        
        mockRoom.students.push({
            name,
            rollNo,
            row,
            col
        });
    }
    
    return { student: foundStudent, room: mockRoom };
}

// Render classroom visualization
function renderClassroomVisualization(student, classroom) {
    const container = document.getElementById('classroom-visualization');
    container.innerHTML = '';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'visualization-header';
    header.innerHTML = `
        <h3><i class="fas fa-door-open"></i> ${classroom.name}</h3>
        <div class="invigilator"><i class="fas fa-user-shield"></i> ${classroom.invigilator}</div>
    `;
    container.appendChild(header);
    
    // Create grid container with fixed columns
    const grid = document.createElement('div');
    grid.className = 'visualization-grid';
    grid.style.gridTemplateColumns = `repeat(${classroom.cols}, 1fr)`;
    
    // Create grid cells in order by row and column
    for (let row = 0; row < classroom.rows; row++) {
        for (let col = 0; col < classroom.cols; col++) {
            const seatDiv = document.createElement('div');
            seatDiv.className = 'visualization-seat';
            seatDiv.dataset.row = row;
            seatDiv.dataset.col = col;
            
            // Find if seat is occupied
            const occupant = classroom.students.find(s => s.row === row && s.col === col);
            
            if (occupant) {
                seatDiv.classList.add('occupied');
                
                // Check if this is the student's seat
                if (occupant.rollNo === student.rollNo) {
                    seatDiv.classList.add('your-seat');
                    seatDiv.innerHTML = `
                        <div class="student-name">YOU</div>
                        <div class="student-roll">${occupant.rollNo}</div>
                        <span class="seat-number">R${row+1}C${col+1}</span>
                    `;
                } else {
                    seatDiv.innerHTML = `
                        <div class="student-name">${occupant.name.length > 8 ? occupant.name.substring(0, 8) + '...' : occupant.name}</div>
                        <div class="student-roll">${occupant.rollNo}</div>
                        <span class="seat-number">R${row+1}C${col+1}</span>
                    `;
                }
            } else {
                seatDiv.innerHTML = `
                    <div class="empty-label">Empty</div>
                    <span class="seat-number">R${row+1}C${col+1}</span>
                `;
            }
            
            grid.appendChild(seatDiv);
        }
    }
    
    container.appendChild(grid);
}

// Render seat neighbors
function renderSeatNeighbors(student, classroom) {
    const container = document.getElementById('neighbors-grid');
    container.innerHTML = '';
    
    // Find neighbors in adjacent seats
    const neighbors = [];
    
    // Check all adjacent positions
    const directions = [
        {name: 'Top Left', rowDiff: -1, colDiff: -1},
        {name: 'Top', rowDiff: -1, colDiff: 0},
        {name: 'Top Right', rowDiff: -1, colDiff: 1},
        {name: 'Left', rowDiff: 0, colDiff: -1},
        {name: 'Right', rowDiff: 0, colDiff: 1},
        {name: 'Bottom Left', rowDiff: 1, colDiff: -1},
        {name: 'Bottom', rowDiff: 1, colDiff: 0},
        {name: 'Bottom Right', rowDiff: 1, colDiff: 1}
    ];
    
    directions.forEach(dir => {
        const adjRow = student.row + dir.rowDiff;
        const adjCol = student.col + dir.colDiff;
        
        // Check if position is valid
        if (adjRow >= 0 && adjRow < classroom.rows && adjCol >= 0 && adjCol < classroom.cols) {
            // Find student at this position
            const neighbor = classroom.students.find(s => s.row === adjRow && s.col === adjCol);
            
            if (neighbor) {
                neighbors.push({
                    student: neighbor,
                    position: dir.name
                });
            }
        }
    });
    
    if (neighbors.length === 0) {
        container.innerHTML = '<p class="no-neighbors">No neighbors found in adjacent seats.</p>';
        return;
    }
    
    // Create neighbor cards
    neighbors.forEach(neighbor => {
        const card = document.createElement('div');
        card.className = 'neighbor-card';
        card.innerHTML = `
            <div class="neighbor-icon">
                <i class="fas fa-user"></i>
            </div>
            <div class="neighbor-info">
                <div class="neighbor-name">${neighbor.student.name}</div>
                <div class="neighbor-roll">${neighbor.student.rollNo}</div>
            </div>
            <span class="neighbor-position">${neighbor.position}</span>
        `;
        
        container.appendChild(card);
    });
}

// Download as Excel
function downloadAsExcel() {
    if (!currentAllocation) {
        showToast('No allocation data to download', 'error');
        return;
    }
    
    try {
        // Prepare data for Excel
        const excelData = [];
        
        // Add headers
        excelData.push(['Classroom', 'Row', 'Column', 'Seat Number', 'Student Name', 'Roll No', 'Invigilator']);
        
        // Add allocation data
        currentAllocation.classrooms.forEach(room => {
            for (let row = 0; row < room.rows; row++) {
                for (let col = 0; col < room.cols; col++) {
                    const student = room.students.find(s => s.row === row && s.col === col);
                    
                    excelData.push([
                        room.name,
                        row + 1,
                        col + 1,
                        `r${row+1}c${col+1}`,
                        student ? student.name : 'Empty',
                        student ? student.rollNo : '',
                        room.invigilator
                    ]);
                }
            }
        });
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, 'Seat Allocation');
        
        // Generate file and download
        const fileName = `SeatAllocation_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        
        showToast('Excel file downloaded successfully');
    } catch (error) {
        console.error('Error generating Excel:', error);
        showToast('Error generating Excel file', 'error');
    }
}

// Update home page stats
function updateHomeStats() {
    // These are mock values - in a real app you would get this from your backend
    document.getElementById('students-count').textContent = '1,250';
    document.getElementById('classrooms-count').textContent = '24';
    document.getElementById('exams-count').textContent = '8';
}

// Update results summary
function updateResultsSummary(allocation) {
    if (!allocation) return;
    
    let totalStudents = 0;
    allocation.classrooms.forEach(room => {
        totalStudents += room.students.length;
    });
    
    document.getElementById('total-students').textContent = totalStudents;
    document.getElementById('total-rooms').textContent = allocation.classrooms.length;
    document.getElementById('total-invigilators').textContent = allocation.classrooms.length;
}

// Password strength indicator
function updatePasswordStrength(password) {
    const strengthBars = document.querySelectorAll('.strength-bar');
    const strengthText = document.querySelector('.strength-text');
    
    // Reset
    strengthBars.forEach(bar => {
        bar.style.backgroundColor = '#e9ecef';
    });
    strengthText.textContent = 'Password strength';
    strengthText.style.color = '#6c757d';
    
    if (password.length === 0) return;
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    // Cap at 5
    strength = Math.min(strength, 5);
    
    // Update UI
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745', '#20c997'];
    const texts = ['Very Weak', 'Weak', 'Moderate', 'Strong', 'Very Strong'];
    
    for (let i = 0; i < strength; i++) {
        strengthBars[i].style.backgroundColor = colors[strength - 1];
    }
    
    if (strength > 0) {
        strengthText.textContent = texts[strength - 1];
        strengthText.style.color = colors[strength - 1];
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastIcon = toast.querySelector('.toast-icon');
    const toastMessage = toast.querySelector('.toast-message');
    
    // Set content and style based on type
    toastMessage.textContent = message;
    
    if (type === 'error') {
        toast.style.backgroundColor = '#f72585';
        toastIcon.className = 'fas fa-exclamation-circle toast-icon';
    } else if (type === 'warning') {
        toast.style.backgroundColor = '#f77f00';
        toastIcon.className = 'fas fa-exclamation-triangle toast-icon';
    } else {
        toast.style.backgroundColor = '#4cc9f0';
        toastIcon.className = 'fas fa-check-circle toast-icon';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Setup row filter options
function setupRowFilter() {
    const filterRow = document.getElementById('filter-row');
    
    // Clear existing options except the first one
    while (filterRow.options.length > 1) {
        filterRow.remove(1);
    }
    
    // If we have current allocation data
    if (currentAllocation && currentAllocation.classrooms) {
        // Find the maximum number of rows across all classrooms
        let maxRows = 0;
        currentAllocation.classrooms.forEach(classroom => {
            if (classroom.rows > maxRows) {
                maxRows = classroom.rows;
            }
        });
        
        // Add options for each row
        for (let i = 1; i <= maxRows; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Row ${i}`;
            filterRow.appendChild(option);
        }
    }
}

// Apply results filter with enhanced functionality
function applyResultsFilter() {
    showLoading();
    
    const roomFilter = document.getElementById('filter-room').value;
    const rowFilter = document.getElementById('filter-row').value;
    const studentSearch = document.getElementById('search-student').value.toLowerCase();
    
    // Get all classrooms and seats
    const classrooms = document.querySelectorAll('.classroom');
    let totalVisibleSeats = 0;
    let totalOccupiedVisibleSeats = 0;
    
    // Apply filters to each classroom
    classrooms.forEach(classroom => {
        const roomName = classroom.querySelector('h3').textContent;
        const seats = classroom.querySelectorAll('.seat');
        const occupiedSeats = classroom.querySelectorAll('.seat.occupied');
        
        // Check if classroom matches room filter
        const roomMatches = roomFilter === 'all' || roomName.includes(roomFilter);
        
        // Track seats that match criteria for this classroom
        let hasMatchingStudent = false;
        let hasMatchingRow = false;
        
        // If room filter passes, check individual seats
        if (roomMatches) {
            // Hide all seats initially
            seats.forEach(seat => {
                seat.classList.add('filtered-out');
            });
            
            // Check each seat
            occupiedSeats.forEach(seat => {
                const studentText = seat.textContent.toLowerCase();
                const seatNumber = seat.querySelector('.seat-number').textContent;
                const rowMatch = rowFilter === 'all' || seatNumber.startsWith(`R${rowFilter}`);
                const studentMatch = !studentSearch || studentText.includes(studentSearch);
                
                // Show seat if it matches all filters
                if (rowMatch && studentMatch) {
                    seat.classList.remove('filtered-out');
                    hasMatchingStudent = true;
                    hasMatchingRow = true;
                    totalVisibleSeats++;
                    totalOccupiedVisibleSeats++;
                }
            });
            
            // For unoccupied seats, only check row filter
            seats.forEach(seat => {
                if (!seat.classList.contains('occupied')) {
                    const seatNumber = seat.querySelector('.seat-number').textContent;
                    const rowMatch = rowFilter === 'all' || seatNumber.startsWith(`R${rowFilter}`);
                    
                    if (rowMatch) {
                        seat.classList.remove('filtered-out');
                        hasMatchingRow = true;
                        totalVisibleSeats++;
                    }
                }
            });
        }
        
        // Show/hide classroom based on filters
        if (roomMatches && (hasMatchingStudent || hasMatchingRow)) {
            classroom.style.display = 'block';
        } else {
            classroom.style.display = 'none';
        }
    });
    
    // Update filtered utilization data
    updateFilteredUtilization(totalOccupiedVisibleSeats, totalVisibleSeats);
    
    // Add filter activity
    addActivity('Results Filtered', `Applied filters: ${roomFilter !== 'all' ? roomFilter : 'All Rooms'}, ${rowFilter !== 'all' ? 'Row ' + rowFilter : 'All Rows'}, ${studentSearch ? `Search: ${studentSearch}` : 'No search term'}`, 'fas fa-filter');
    
    hideLoading();
    showToast('Filter applied successfully');
    
    // Add active class to filter button
    document.getElementById('filter-results').classList.add('active');
}

// Clear results filter with enhanced functionality
function clearResultsFilter() {
    showLoading();
    
    // Reset filter inputs
    document.getElementById('filter-room').value = 'all';
    document.getElementById('filter-row').value = 'all';
    document.getElementById('search-student').value = '';
    
    // Show all classrooms
    document.querySelectorAll('.classroom').forEach(classroom => {
        classroom.style.display = 'block';
        
        // Show all seats
        classroom.querySelectorAll('.seat').forEach(seat => {
            seat.classList.remove('filtered-out');
        });
    });
    
    // Recalculate and update utilization based on all data
    calculateRoomUtilization();
    
    // Add clear filter activity
    addActivity('Filters Cleared', 'All filters have been cleared from results', 'fas fa-times-circle');
    
    hideLoading();
    showToast('Filters cleared');
    
    // Remove active class from filter button
    document.getElementById('filter-results').classList.remove('active');
}

// Update filtered utilization
function updateFilteredUtilization(occupiedSeats, totalSeats) {
    const utilizationPercentage = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
    
    // Update the utilization display
    document.getElementById('room-utilization').textContent = `${utilizationPercentage}%`;
    
    // Update the color based on utilization level
    const utilizationElement = document.getElementById('room-utilization');
    
    if (utilizationPercentage < 30) {
        utilizationElement.style.color = 'var(--danger-color)';
    } else if (utilizationPercentage < 70) {
        utilizationElement.style.color = 'var(--warning-color)';
    } else {
        utilizationElement.style.color = 'var(--success-color)';
    }
}

// Calculate and update room utilization
function calculateRoomUtilization() {
    if (!currentAllocation || !currentAllocation.classrooms) {
        document.getElementById('room-utilization').textContent = '0%';
        return;
    }
    
    let totalCapacity = 0;
    let totalOccupied = 0;
    
    // Calculate based on all classrooms
    currentAllocation.classrooms.forEach(classroom => {
        // Total capacity is rows × columns
        const capacity = classroom.rows * classroom.cols;
        totalCapacity += capacity;
        
        // Count occupied seats - handle different possible data structures
        if (classroom.students && Array.isArray(classroom.students)) {
            totalOccupied += classroom.students.length;
        }
    });
    
    // Calculate utilization percentage
    updateFilteredUtilization(totalOccupied, totalCapacity);
}

// Function to populate room filter when displaying allocation results
function populateRoomFilter(allocation) {
    const filterRoom = document.getElementById('filter-room');
    
    // Clear existing options except the first one
    while (filterRoom.options.length > 1) {
        filterRoom.remove(1);
    }
    
    // Add option for each classroom
    allocation.classrooms.forEach((classroom, index) => {
        const option = document.createElement('option');
        option.value = classroom.name;
        option.textContent = classroom.name;
        filterRoom.appendChild(option);
    });
}

// Add activity to timeline
function addActivity(title, description, icon) {
    // Create activity object
    const activity = {
        title,
        description,
        icon: icon || 'fas fa-info-circle',
        timestamp: new Date().getTime()
    };
    
    // Add to start of array
    recentActivities.unshift(activity);
    
    // Limit to 10 most recent activities
    if (recentActivities.length > 10) {
        recentActivities.pop();
    }
    
    // Update UI if on home page
    if (document.getElementById('home-page').classList.contains('active')) {
        updateActivityTimeline();
    }
    
    // Update activity count
    const countElement = document.getElementById('recent-activity-count');
    if (countElement) {
        countElement.textContent = recentActivities.length;
    }
}

// Update activity timeline on home page
function updateActivityTimeline() {
    const timelineContainer = document.getElementById('activity-timeline');
    if (!timelineContainer) return;
    
    timelineContainer.innerHTML = '';
    
    if (recentActivities.length === 0) {
        timelineContainer.innerHTML = `
            <div class="empty-activity">
                <i class="fas fa-history"></i>
                <p>No recent activities</p>
            </div>
        `;
        return;
    }
    
    // Add each activity to timeline
    recentActivities.forEach(activity => {
        const activityTime = new Date(activity.timestamp).toLocaleString();
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        activityItem.innerHTML = `
            <div class="activity-time">${activityTime}</div>
            <div class="activity-content">
                <div class="activity-title">
                    <i class="${activity.icon}"></i> ${activity.title}
                </div>
                <div class="activity-description">${activity.description}</div>
            </div>
        `;
        
        timelineContainer.appendChild(activityItem);
    });
}

// Show loading overlay
function showLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('active');
    }
}

// Hide loading overlay
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.remove('active');
    }
}
