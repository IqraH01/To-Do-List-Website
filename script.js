// references for tasks
const taskInput = document.getElementById('taskInput');
const categoryInput = document.getElementById('categoryInput');
const priorityInput = document.getElementById('priorityInput');
const dueDateInput = document.getElementById('dueDateInput');
const notesInput = document.getElementById('notesInput');
const estimatedTimeInput = document.getElementById('estimatedTimeInput');
const energyRequiredInput = document.getElementById('energyRequiredInput');
const attachmentInput = document.getElementById('attachmentInput');
const taskList = document.getElementById('taskList');
const filterCategory = document.getElementById('filterCategory');
const addTaskBtn = document.getElementById('addTaskBtn');
const sortPriorityBtn = document.getElementById('sortPriorityBtn');
const sortDueDateBtn = document.getElementById('sortDueDateBtn');
const voiceInputBtn = document.getElementById('voiceInputBtn');
const voiceDateInputBtn = document.getElementById('voiceDateInputBtn');
const viewActiveBtn = document.getElementById('viewActiveBtn');
const viewCompletedBtn = document.getElementById('viewCompletedBtn');

// references for calendar
const toggleViewBtn = document.getElementById('toggleViewBtn');
const calendarContainer = document.querySelector('.calendar-container');
const prevMonthBtn = document.getElementById('prevMonthBtn');
const nextMonthBtn = document.getElementById('nextMonthBtn');
const currentMonthDisplay = document.getElementById('currentMonthDisplay');
const calendarDays = document.getElementById('calendarDays');

// references for shopping list and download btn
const shoppingListBtn = document.getElementById('shoppingListBtn');
const downloadBtn = document.createElement('button');

// ai priority
const aiSuggestBtn = document.createElement('button');
aiSuggestBtn.id = 'aiSuggestBtn';
aiSuggestBtn.type = 'button';
aiSuggestBtn.textContent = 'Suggest Priority';
aiSuggestBtn.className = 'ai-suggest-btn';

// task array from local storage or create empty array if none exist
// array for completed and incomplete
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let completedTasks = JSON.parse(localStorage.getItem('completedTasks')) || [];
let currentView = 'active'; // see task view - active/complete
let viewMode = 'list'; // see list view - list/calendar

// streak tracking
let myStreak = parseInt(localStorage.getItem('myStreak')) || 0;
let lastCompletionDate = localStorage.getItem('lastCompletionDate') || '';

// calendar state tracking
let currentMonth = new Date().getMonth(); // start at current month
let currentYear = new Date().getFullYear(); // start at current year

// get or set level
let myXP = parseInt(localStorage.getItem('myXP')) || 0;
let myLevel = parseInt(localStorage.getItem('myLevel')) || 1;

// weekly challenges
let currentWeekNumber = getWeekNumber(new Date()); // current week number
let lastWeekChecked = parseInt(localStorage.getItem('lastWeekChecked')) || 0; // if new week reset
let weeklyChallenges = JSON.parse(localStorage.getItem('weeklyChallenges')) || [];
let completedChallenges = JSON.parse(localStorage.getItem('completedChallenges')) || [];

// two alternating weekly challenges as example
const challengeTypes = [
    {
        id: 'taskStreakChallenge',
        description: 'Complete at least one task for 5 consecutive days',
        xpReward: 50,
        progress: 0,
        goalValue: 5,
        progressType: 'streak'
    },
    {
        id: 'priorityTaskChallenge',
        description: 'Complete 3 high priority tasks this week',
        xpReward: 50,
        progress: 0,
        goalValue: 3,
        progressType: 'count',
        taskFilter: 'high'
    }
];

// increasing xp needed for each next level
function getXPForNextLevel(level) {
    return level * 100;
}

// function to get the week number in a year for a date
function getWeekNumber(date) {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date - firstDayOfYear) / 86400000;  //ms to days
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// on page load
window.onload = function () {
    displayAllTasks();
    updateTabHighlight();
    updateUserLevel();
    checkMissedDays();  // check for missed days on page load
    displayStreak();
    checkForNewWeek();  // check for new challenge load
    displayWeeklyChallenges();
    
    // calendar view listeners
    toggleViewBtn.addEventListener('click', toggleView); // change view - list/calendar
    prevMonthBtn.addEventListener('click', () => changeMonth(-1));
    nextMonthBtn.addEventListener('click', () => changeMonth(1));
    
    // render calendar if in calendar view
    if (viewMode === 'caIlendar') {
        makeCalendar();
    }
};

// speech recognition for task name object
let taskRecognition;
// check if SpeechRecognition is supported by broswer
if (window.SpeechRecognition || window.webkitSpeechRecognition) { // adapted from video:https://www.youtube.com/watch?v=dDaDmDP9cmc
    taskRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    taskRecognition.interimResults = false; // return final result
    taskRecognition.continuous = false;   // stop listening after this

    // event listener for task name VI
    voiceInputBtn.addEventListener('click', () => {
        taskRecognition.start();
        voiceInputBtn.textContent = "Listening...";
    });

    // if speech is collected
    taskRecognition.onresult = (event) => {
        let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) { // from video:https://www.youtube.com/watch?v=dDaDmDP9cmc
        transcript += event.results[i][0].transcript;
    }
    transcript = transcript.trim();  // trim the concatenated result
    taskInput.value = transcript; // put text in input field 
    };

    // reset btn txt after 
    taskRecognition.onend = () => {
        voiceInputBtn.textContent = "Voice Input";
    };

    // if voice recog error
    taskRecognition.onerror = (event) => { // error handle
        console.error("Speech recognition error:", event.error);
        voiceInputBtn.textContent = "Voice Input";
    };
} else {
    // hide voice input buttons if not supported
    if (voiceInputBtn) voiceInputBtn.style.display = 'none';
    if (voiceDateInputBtn) voiceDateInputBtn.style.display = 'none';
}

// speech recognition for date 
let dateRecognition;
// check if SpeechRecognition is available for browser
if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    dateRecognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    dateRecognition.interimResults = false; // get final results 
    dateRecognition.continuous = false; // stop after one result

    // event listener for date VI
    voiceDateInputBtn.addEventListener('click', () => {
        dateRecognition.start();
        voiceDateInputBtn.textContent = "Listening...";
    });

    // handle result of speech for date
    dateRecognition.onresult = (event) => {
        let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) { // adapted from video:https://www.youtube.com/watch?v=dDaDmDP9cmc
        transcript += event.results[i][0].transcript;
    }
    transcript = transcript.trim(); // trim the concatenated result
    const formattedDate = formatDate(transcript);  // format as yyyy-mm-dd
    dueDateInput.value = formattedDate; // set input field 
    };

    // reset button name after
    dateRecognition.onend = () => {
        voiceDateInputBtn.textContent = "Date Input"; // reset button text
    };

    dateRecognition.onerror = (event) => { // error handle
        console.error("Speech recognition error:", event.error); // adapted from video:https://www.youtube.com/watch?v=dDaDmDP9cmc
        voiceDateInputBtn.textContent = "Date Input"; 
    };
}


// format date for VI as yyyy-mm-dd
function formatDate(dateStr) {
    try {
        const date = new Date(dateStr); // create date
        if (isNaN(date.getTime())) return ""; // if failed, empty
        // add 0 if needed when getting year, month, date
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); 
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { // if error
        console.error("Error formatting date:", e);
        return "";
    }
}

// add task btn listener
addTaskBtn.addEventListener('click', addTask);

// add tasks
function addTask() {  // get all info
    const taskText = taskInput.value.trim();
    const category = categoryInput.value;
    const priority = priorityInput.value;
    const dueDate = dueDateInput.value;
    const notes = notesInput.value.trim();
    const estimatedTime = estimatedTimeInput.value.trim();
    const energyRequired = energyRequiredInput.value.trim();

    if (taskText === '' || dueDate === '') {
        alert("Task and Due Date are required.");
        return;   // name and date are mandatory
    }

    // file attach, read with FileReader
    if (attachmentInput.files.length > 0) {
        const file = attachmentInput.files[0]; // get file
        const reader = new FileReader(); // new file reader

        reader.onload = function (event) { 
            const attachment = event.target.result; // when loaded, save task with attachment 
            saveNewTask(taskText, category, priority, dueDate, notes, estimatedTime, energyRequired, attachment);
        };
        // read file as data URL
        reader.readAsDataURL(file);
    } else {  // if no attachment
        saveNewTask(taskText, category, priority, dueDate, notes, estimatedTime, energyRequired, null);
    }
}

// add new task to array
function saveNewTask(taskText, category, priority, dueDate, notes, estimatedTime, energyRequired, attachment) {
    const task = {
        text: taskText,
        category,
        priority,
        dueDate,
        notes,
        estimatedTime,
        energyRequired,
        attachment,
        showNotes: false, // hide notes first
        completed: false
    };

    tasks.push(task);   // push onto array
    saveTasks(); // save to local storage
    
    // if calendar view, update calendar
    if (viewMode === 'calendar') {
        makeCalendar();
    } else {
        displayAllTasks();
    }

    // clear for next entry
    taskInput.value = '';
    categoryInput.value = 'general';
    priorityInput.value = 'medium';
    dueDateInput.value = '';
    notesInput.value = '';
    estimatedTimeInput.value = '';
    energyRequiredInput.value = '';
    attachmentInput.value = ''; 
}

// check if a day was missed for streak
function checkMissedDays() {
    if (!lastCompletionDate) {
        return; // no previous completion, nothing to check
    }
    
    const today = new Date().toISOString().split('T')[0]; // get today, last completed and current date
    const lastDate = new Date(lastCompletionDate);
    const currentDate = new Date(today);
    
    // calculate difference in days
    const timeDiff = currentDate.getTime() - lastDate.getTime(); // ms
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24)); // convert to days
    
    // if > 1 day has passed, reset the streak
    if (daysDiff > 1) {
        myStreak = 0;
        localStorage.setItem('myStreak', myStreak);
        displayStreak(); // update streak display after reset
    }
}

// update streak counter
function updateStreak() {
    const today = new Date().toISOString().split('T')[0]; // yyyy-mm-dd format of todays date
    
    // check if already completed task today (stays the same)
    if (lastCompletionDate === today) {
        return;
    }
    
    // check if missed a day (more than 1 day since last completion)
    if (lastCompletionDate) {
        const lastDate = new Date(lastCompletionDate);
        const currentDate = new Date(today);
        
        // calculate difference in ms and days
        const timeDiff = currentDate.getTime() - lastDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        // if > 1 day passed, reset the streak
        if (daysDiff > 1) {
            myStreak = 0;
        }
    }
    
    // increment streak, update last completion date
    myStreak++;
    lastCompletionDate = today;
    
    // save updated streak data if closed
    localStorage.setItem('myStreak', myStreak);
    localStorage.setItem('lastCompletionDate', lastCompletionDate);
    
    // display streak update notif
    showStreakNotification(myStreak);
    
    // update streak display
    displayStreak();
}

// show streak notification
function showStreakNotification(days) {
    // make notif if none
    let notification = document.querySelector('.streak-notification'); // find existing
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'streak-notification';
        document.body.appendChild(notification);
    }
    
    // set streak and show notif
    // emoji from https://emojipedia.org/fire
    notification.textContent = `${days} Day Streak! 🔥`;
    notification.classList.add('show');
    
    // hide notif after 2.5s
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2500);
}

// display streak in UI
function displayStreak() {
    // find existing container for streak
    const levelContainer = document.getElementById('levelContainer');
    if (levelContainer) {
        let streakDisplay = levelContainer.querySelector('.streak-display');
        
        // create streak display if it doesn't exist
        if (!streakDisplay) {
            streakDisplay = document.createElement('div');
            streakDisplay.className = 'streak-display';
            levelContainer.appendChild(streakDisplay);
        }
        
        // update streak display
        streakDisplay.innerHTML = `
            <div class="streak-icon">🔥</div>
            <div class="streak-text">Streak: ${myStreak} days</div>
        `;
    }
}

// update level display
function updateUserLevel() {
    // check if need to level up
    const xpForNextLevel = getXPForNextLevel(myLevel);
    if (myXP >= xpForNextLevel) {
        myLevel++;
        myXP -= xpForNextLevel;
        // save updated level 
        localStorage.setItem('myLevel', myLevel);
    }
    
    // save current xp if no level up
    localStorage.setItem('myXP', myXP);
    
    // update UI for level
    const levelContainer = document.getElementById('levelContainer');
    if (levelContainer) {
        const nextLevelXP = getXPForNextLevel(myLevel);
        const progressPercent = (myXP / nextLevelXP) * 100; // calculate progress bar
        
        //update current level, txt and bar
        levelContainer.querySelector('.level-number').textContent = myLevel;
        levelContainer.querySelector('.xp-text').textContent = `XP: ${myXP}/${nextLevelXP}`;
        levelContainer.querySelector('.progress-bar-fill').style.width = `${progressPercent}%`;
        
        // update avatar based on level
        // emojis from https://emojipedia.org/3rd-place-medal
        // https://emojipedia.org/2nd-place-medal
        // https://emojipedia.org/1st-place-medal
        const avatar = levelContainer.querySelector('.avatar');
        if (avatar) {
            if (myLevel >= 15) {
                avatar.innerHTML = '🥇'; // gold medal for level 15+
                avatar.classList.remove('bronze', 'silver');
                avatar.classList.add('gold');
            } else if (myLevel >= 10) {
                avatar.innerHTML = '🥈'; // silver medal for level 10-14
                avatar.classList.remove('bronze', 'gold');
                avatar.classList.add('silver');
            } else if (myLevel >= 5) {
                avatar.innerHTML = '🥉'; // bronze medal for level 5-9
                avatar.classList.remove('silver', 'gold');
                avatar.classList.add('bronze');
            } else {
                avatar.innerHTML = myLevel; // just show level number for levels 1-4
                avatar.classList.remove('bronze', 'silver', 'gold');
            }
        }
    }
}

// display tasks on current view
function displayAllTasks() {
    if (!taskList) return; // Safety check
    
    taskList.innerHTML = ''; // clear existing 

    const selectedCategory = filterCategory.value;
    
    // which array?
    const displayArray = currentView === 'active' ? tasks : completedTasks;
    
    let filteredTasks = displayArray;
    
    // filter if not all
    if (selectedCategory !== 'all') {
        filteredTasks = displayArray.filter(task => task.category === selectedCategory);
    }

    // empty message if nothing in filter 
    if (filteredTasks.length === 0) {
        const emptyMessage = document.createElement('li');
        emptyMessage.className = 'empty-list-message';
        emptyMessage.textContent = currentView === 'active' 
            ? 'No active tasks to display.' 
            : 'No completed tasks to display.';
        taskList.appendChild(emptyMessage);
    } else {  // display tasks by filter
        filteredTasks.forEach((task, index) => displayTask(task, index));
    }
}

// html for single task
function displayTask(task, index) {
    const li = document.createElement('li');
    
    // common HTML for active/complete, task info
    // common HTML for active/complete, task info
    // emoji from https://emojipedia.org/exclamation-mark
    let taskHTML = `
    <span class="task-text">${overdue(task) ? '<span class="overdue-marker">❗</span>' : ''} ${task.text} (${task.category}, <strong>${task.priority}</strong>, Due: ${task.dueDate})</span>
        <button class="toggle-notes-btn" onclick="toggleNotes(${index})">
            ${task.showNotes ? 'Hide Details' : 'Show Details'}
        </button>
    `;
    
    // edit btns based on current view
    if (currentView === 'active') {
        taskHTML += `
            <button class="complete-btn" onclick="completeTask(${index})">Complete</button>
            <button class="delete-btn" onclick="deleteTask(${index})">Delete</button>
            <button class="edit-btn" onclick="editTask(${index})">Edit</button>
        `;
    } else {
        taskHTML += `
            <button class="restore-btn" onclick="restoreTask(${index})">Restore</button>
            <button class="delete-btn" onclick="deleteCompletedTask(${index})">Delete</button>
        `;
    }
    
    // task details hidden unless shown
    taskHTML += `
        <div class="task-details" style="display: ${task.showNotes ? 'block' : 'none'};">
            <p><strong>Notes:</strong> ${task.notes || "No notes added."}</p>
            <p><strong>Estimated Time:</strong> ${task.estimatedTime || "Not specified"}</p>
            <p><strong>Energy Required:</strong> ${task.energyRequired || "Not specified"}</p>
            ${task.attachment ? `<p><strong>Attachment:</strong> <a href="${task.attachment}" target="_blank">View File</a></p>` : ""}
        </div>
    `;
    
    li.innerHTML = taskHTML;
    taskList.appendChild(li);
}

// save tasks to local storage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
}

// delete task
function deleteTask(index) {
    tasks.splice(index, 1);
    saveTasks();
    
    // update the current view (list or calendar)
    if (viewMode === 'calendar') {
        makeCalendar();
    } else {
        displayAllTasks();
    }
}

// delete completed task
function deleteCompletedTask(index) {
    completedTasks.splice(index, 1);
    saveTasks();
    displayAllTasks();
}

// switch task details visibility
function toggleNotes(index) {
    if (currentView === 'active') {
        tasks[index].showNotes = !tasks[index].showNotes;
    } else {
        completedTasks[index].showNotes = !completedTasks[index].showNotes;
    }
    saveTasks();
    displayAllTasks();
}

// move from completed to active
function restoreTask(index) {
    const task = completedTasks[index];
    tasks.push(task);
    completedTasks.splice(index, 1);
    saveTasks();
    displayAllTasks();
}

// edit task
function editTask(index) {
    const task = tasks[index];
    
    // put info in left section to edit
    taskInput.value = task.text;
    categoryInput.value = task.category;
    priorityInput.value = task.priority;
    dueDateInput.value = task.dueDate;
    notesInput.value = task.notes || '';
    estimatedTimeInput.value = task.estimatedTime || '';
    energyRequiredInput.value = task.energyRequired || '';
    
    // delete task and add again
    deleteTask(index);
}

// xp notif anim upon completion 
function showXPNotification(amount) {
    // make notif if none
    let notification = document.querySelector('.xp-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'xp-notification';
        document.body.appendChild(notification);
    }
    
    // set xp and show notif
    notification.textContent = `+${amount} XP`;
    notification.classList.add('show');
    
    // hide notif after 2.5s
    setTimeout(() => {
        notification.classList.remove('show');
    }, 2500);
    
    // update level
    updateUserLevel();
}

// switch between list and calendar view
function toggleView() {
    const taskListView = document.querySelector('.task-list');
    
    if (viewMode === 'list') {
        // switch to calendar
        taskListView.style.display = 'none';
        calendarContainer.style.display = 'block';
        toggleViewBtn.textContent = 'List View';
        viewMode = 'calendar';
        makeCalendar();
    } else {
        // switch to list
        taskListView.style.display = 'block';
        calendarContainer.style.display = 'none';
        toggleViewBtn.textContent = 'Calendar View';
        viewMode = 'list';
    }
}

// change month shown
function changeMonth(change) {
    currentMonth += change;
    
    // year change
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    
    makeCalendar();
}

// render calendar with tasks
function makeCalendar() {
    if (!calendarDays) return; // Safety check
    
    // clear calendar days
    calendarDays.innerHTML = '';
    
    // update the current month display
    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];
    currentMonthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
    
    // get first day of the month and total days in month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        calendarDays.appendChild(emptyDay);
    }
    
    // create cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        
        // highlight today's date
        const today = new Date();
        if (today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear) {
            dayCell.classList.add('today');
        }
        
        // date number in top right
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date';
        dateDiv.textContent = day;
        dayCell.appendChild(dateDiv);
        
        // current day as string yyyy-mm-dd
        const currentDate = new Date(currentYear, currentMonth, day);
        const formattedDate = formatDateToString(currentDate);
        
        // add tasks for this day
        const dayTasks = tasks.filter(task => task.dueDate === formattedDate);
        
        dayTasks.forEach(task => {
            const taskItem = document.createElement('div');
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const taskDueDate = new Date(task.dueDate);
            const isTaskOverdue = taskDueDate < today;
            taskItem.className = `task-item ${task.priority} ${isTaskOverdue ? 'overdue' : ''}`;  // colour code by priority
            taskItem.textContent = task.text;
            
            // tooltip for task detail on calendar 
            const tooltip = document.createElement('div');
            tooltip.className = 'task-tooltip';
            tooltip.innerHTML = `
                <strong>${task.text}</strong><br>
                Category: ${task.category}<br>
                Priority: ${task.priority}<br>
                ${task.notes ? `Notes: ${task.notes}<br>` : ''}
                ${task.estimatedTime ? `Time: ${task.estimatedTime}<br>` : ''}
                ${task.energyRequired ? `Energy: ${task.energyRequired}` : ''}
            `;
            
            // tooltip on hover
            taskItem.addEventListener('mouseover', () => {
                tooltip.style.display = 'block';
            });
            
            taskItem.addEventListener('mouseout', () => {
                tooltip.style.display = 'none';
            });
            
            taskItem.appendChild(tooltip);
            dayCell.appendChild(taskItem);
        });
        
        calendarDays.appendChild(dayCell);
    }
}

// date to yyyy-mm-dd string for comparison
function formatDateToString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// check if task is past due date
function overdue(task) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // reset time 
    const dueDate = new Date(task.dueDate);
    return dueDate < today && currentView === 'active';
}

// event listeners for tab switch
if (viewActiveBtn) {
    viewActiveBtn.addEventListener('click', () => {
        currentView = 'active';
        displayAllTasks();
        updateTabHighlight();
    });
}

if (viewCompletedBtn) {
    viewCompletedBtn.addEventListener('click', () => {
        currentView = 'completed';
        displayAllTasks();
        updateTabHighlight();
    });
}

// weekly report button listener
const weeklyReportBtn = document.getElementById('weeklyReportBtn');
if (weeklyReportBtn) {
    weeklyReportBtn.addEventListener('click', generateWeeklyReport);
}

// update tab highlighting
function updateTabHighlight() {
    if (!viewActiveBtn || !viewCompletedBtn) return; // Safety check
    
    if (currentView === 'active') {
        viewActiveBtn.classList.add('active-tab');
        viewCompletedBtn.classList.remove('active-tab');
    } else {
        viewActiveBtn.classList.remove('active-tab');
        viewCompletedBtn.classList.add('active-tab');
    }
}

// update task list on filter 
if (filterCategory) {
    filterCategory.addEventListener('change', displayAllTasks);
}

// sort by priority listener
if (sortPriorityBtn) {
    sortPriorityBtn.addEventListener('click', () => {
        const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
        tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        saveTasks();
        displayAllTasks();
    });
}

// sort by due date listener
if (sortDueDateBtn) {
    sortDueDateBtn.addEventListener('click', () => {
        tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        saveTasks();
        displayAllTasks();
    });
}

// check for new weekly challenges
function checkForNewWeek() {
    const currentWeek = getWeekNumber(new Date());
    
    // if new week, next challenge
    if (currentWeek !== lastWeekChecked) {
        // save challenge before reset
        if (weeklyChallenges.length > 0) {
            const completedWeeklySummary = {
                week: lastWeekChecked,
                year: new Date().getFullYear(),
                challenges: weeklyChallenges.filter(challenge => challenge.progress >= challenge.goalValue)
            };
            
            if (completedWeeklySummary.challenges.length > 0) {
                completedChallenges.push(completedWeeklySummary);
                localStorage.setItem('completedChallenges', JSON.stringify(completedChallenges));
            }
        }
        
        // next challenge based on odd/even
        const w = currentWeek % 2;
        weeklyChallenges = [JSON.parse(JSON.stringify(challengeTypes[w]))];
        
        // Reset progress
        weeklyChallenges.forEach(challenge => challenge.progress = 0);
        
        // Save state
        lastWeekChecked = currentWeek;
        localStorage.setItem('lastWeekChecked', lastWeekChecked);
        localStorage.setItem('weeklyChallenges', JSON.stringify(weeklyChallenges));
    }
}

// Display weekly challenges in UI
function displayWeeklyChallenges() {
    const taskActions = document.querySelector('.task-actions');
    
    // Create container if it doesn't exist
    let challengesContainer = document.getElementById('weeklyChallengesContainer');
    
    if (!challengesContainer) {
        challengesContainer = document.createElement('div');
        challengesContainer.id = 'weeklyChallengesContainer';
        challengesContainer.className = 'weekly-challenges-container';
        
        // Add after the level container
        const levelContainer = document.getElementById('levelContainer');
        if (levelContainer) {
            levelContainer.parentNode.insertBefore(challengesContainer, levelContainer.nextSibling);
        } else {
            taskActions.appendChild(challengesContainer);
        }
    }
    
    // update challenge display
    challengesContainer.innerHTML = `
        <h3>Weekly Challenge</h3>
        <div class="challenge-list">
            ${weeklyChallenges.map(challenge => `
                <div class="challenge-item ${challenge.progress >= challenge.goalValue ? 'challenge-completed' : ''}">
                    <div class="challenge-header">
                        <div class="challenge-reward">+${challenge.xpReward} XP</div>
                    </div>
                    <div class="challenge-description">${challenge.description}</div>
                    <div class="challenge-progress">
                        <div class="challenge-progress-text">
                            Progress: ${challenge.progress}/${challenge.goalValue}
                        </div>
                        <div class="challenge-progress-bar">
                            <div class="challenge-progress-fill" style="width: ${(challenge.progress / challenge.goalValue) * 100}%"></div>
                        </div>
                        </div>
                </div>
                ${challenge.progress >= challenge.goalValue && !challenge.claimed ? 
                    `<button class="claim-reward-btn" onclick="claimChallengeReward('${challenge.id}')">Claim Reward</button>` : 
                    challenge.claimed ? 
                    `<div class="challenge-claimed">Reward Claimed</div>` : ''}
            </div>
        `).join('')}
    </div>
`;
}

// update challenge progress on complete
function updateChallengeProgress(task) {
    let challengesUpdated = false;
    
    weeklyChallenges.forEach(challenge => {
        // don't update if already completed/claimed
        if (challenge.claimed) return;
        
        if (challenge.id === 'taskStreakChallenge') {
            if (myStreak >= challenge.goalValue) {
                challenge.progress = challenge.goalValue;
                challengesUpdated = true;
            } else {
                challenge.progress = myStreak;
                challengesUpdated = true;
            }
        }
        else if (challenge.id === 'priorityTaskChallenge' && task.priority === challenge.taskFilter) {
            challenge.progress++;
            challengesUpdated = true;
        }
    });
    
    if (challengesUpdated) {
        localStorage.setItem('weeklyChallenges', JSON.stringify(weeklyChallenges));
        displayWeeklyChallenges();
    }
}

// claim challenge
function claimChallengeReward(challengeId) {
    const challenge = weeklyChallenges.find(c => c.id === challengeId);
    
    if (challenge && challenge.progress >= challenge.goalValue && !challenge.claimed) {
        // add XP
        myXP += challenge.xpReward;
        localStorage.setItem('myXP', myXP);
        
        // mark as claimed
        challenge.claimed = true;
        localStorage.setItem('weeklyChallenges', JSON.stringify(weeklyChallenges));
        
        // show notif
        showXPNotification(challenge.xpReward);
        
        // update UI
        updateUserLevel();
        displayWeeklyChallenges();
        
        // challenge completed notif
        showChallengeCompletionNotification(challenge.title);
    }
}

// challenge complete notification
function showChallengeCompletionNotification(challengeTitle) {
    // make if doesn't exist
    let notification = document.querySelector('.challenge-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'challenge-notification';
        document.body.appendChild(notification);
    }
    
    // display notification
    // emoji from: https://emojipedia.org/check-mark-button
    notification.innerHTML = `✅ Challenge Complete! <br> ${challengeTitle}`;
    notification.classList.add('show');
    
    // hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// challenges on page load
window.addEventListener('DOMContentLoaded', function() {
    checkForNewWeek();
    displayWeeklyChallenges();
});

// if user completes task 
function completeTask(index) {
    let xpEarned = 0;
    // base xp
    xpEarned += 10;
    
    // bonus xp based on priority
    if (tasks[index].priority === 'high') {
        xpEarned += 15;
    } else if (tasks[index].priority === 'medium') {
        xpEarned += 10;
    } else {
        xpEarned += 5;
    }
    
    // update user xp level
    myXP += xpEarned;
    
    // xp notif
    showXPNotification(xpEarned);
    
    // Update task streak
    updateStreak();
    
    // Update weekly challenges progress
    updateChallengeProgress(tasks[index]);
    
    // move task to completed 
    const completedTask = tasks[index];
    completedTask.completedDate = new Date().toISOString()
    completedTasks.push(completedTask);
    tasks.splice(index, 1);
    
    // update display and save
    saveTasks();
    
    // update correct view
    if (viewMode === 'calendar') {
        makeCalendar();
    } else {
        displayAllTasks();
    }
    
}
// make weekly report
function generateWeeklyReport() {
    // current date vs 7 days ago
    const today = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(today.getDate() - 7);
    
    // filter completed tasks from last week
    const lastWeekTasks = completedTasks.filter(task => {
        const completedDate = new Date(task.completedDate);
        return completedDate >= oneWeekAgo && completedDate <= today;
    });
    
    // make report
    let reportText = "Tasks completed in the last 7 days:\n\n";
    
    if (lastWeekTasks.length === 0) {
        reportText += "No tasks were completed in the last 7 days.";
    } else {
        lastWeekTasks.forEach((task, index) => {
            reportText += `${index + 1}. ${task.text}\n`;
        });
    }
    
    // alert display as example
    alert(reportText);
}

// event listener for shopping list btn
if (shoppingListBtn) {
    shoppingListBtn.addEventListener('click', toggleShoppingList);
}

// toggle view
function toggleShoppingList() {
    // in thsi category but not complete
    const groceryTasks = tasks.filter(task => task.category === 'groceries');
    
    // make report
    let groceryListText = "Shopping List:\n\n";
    
    if (groceryTasks.length === 0) {
        groceryListText += "No grocery items in your task list.";
    } else {
        groceryTasks.forEach((task, index) => {
            groceryListText += `${index + 1}. ${task.text}\n`;
        });
    }
    
    // display like weekly report
    alert(groceryListText);
}

window.addEventListener('DOMContentLoaded', function() {
    
    
    const downloadTasksBtn = document.getElementById('downloadTasksBtn');
    
    // download event listener if button
    if (downloadTasksBtn) {
      downloadTasksBtn.addEventListener('click', downloadTasksAsText);
    }
  });
  
  // download tasks as txt
  function downloadTasksAsText() {
    // make txt
    let content = 'MY TASKS\n\n';
    
    // add active
    content += 'ACTIVE TASKS:\n';
    if (tasks.length === 0) {
      content += 'No active tasks.\n';
    } else {
      tasks.forEach((task, index) => {
        content += `${index + 1}. ${task.text}\n`;
      });
    }
    
    // add complete
    content += '\nCOMPLETED TASKS:\n';
    if (completedTasks.length === 0) {
      content += 'No completed tasks.\n';
    } else {
      completedTasks.forEach((task, index) => {
        content += `${index + 1}. ${task.text}\n`;
      });
    }
    
    // make file
    // adapted from: https://www.youtube.com/watch?v=aCwmSI-z2kQ
    const blob = new Blob([content], { type: 'text/plain' }); 
    const url = URL.createObjectURL(blob);
    
    // download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_tasks.txt';
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  }
      // button after priority 
priorityInput.parentNode.insertBefore(aiSuggestBtn, priorityInput.nextSibling);

// event listener
aiSuggestBtn.addEventListener('click', suggestPriority);

function suggestPriority() {
    const taskText = taskInput.value.trim();
    
    if (taskText === '') {
        alert("Please enter a task first");
        return;
    }
    
    // keyword-based ai
    const urgentKeywords = ['urgent', 'immediately', 'deadline', 'important', 'critical', 'meeting', 'exam'];
    
    // if urgent words
    const hasUrgentKeyword = urgentKeywords.some(keyword => 
        taskText.toLowerCase().includes(keyword)
    );
    
    if (hasUrgentKeyword) {
        priorityInput.value = 'high';
        alert("Urgent keywords have been recognised. Priority will be automatically set to high.");
    } else {
        alert("Urgent keywords have not been recognised. Priority will remain the same.");
    }
}