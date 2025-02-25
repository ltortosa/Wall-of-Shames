function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function submitShame() {
    const shameText = document.getElementById('shame-text').value;
    if (!shameText.trim()) {
        alert('Please write something before posting.');
        return;
    }

    const wordCount = shameText.trim().split(/\s+/).length;
    if (wordCount < 10) {
        alert('Your post must contain at least ten words.');
        return;
    }

    const userId = generateUUID();

    db.collection("posts").add({
        text: shameText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        votes: 0,
        userId: userId
    })
    .then(() => {
        alert(`Posted anonymously! Your unique identifier is: ${userId}. Please store this ID securely to check if you win.`);
        document.getElementById('shame-text').value = "";
        loadPosts(); 
    })
    .catch(() => {
        alert("Failed to post. Please try again.");
    });
}

// PAGINATION VARIABLES
let pageSize = 5; 
let currentPage = 1;
let lastVisible = null;
let firstVisible = null;

function loadPosts(page = 1) {
    console.log('Loading posts for page:', page);
    const postsContainer = document.getElementById('posts-container');
    postsContainer.innerHTML = "";

    let query = db.collection("posts")
        .orderBy("timestamp", "desc")
        .limit(pageSize);

    if (page > 1 && lastVisible) {
        query = query.startAfter(lastVisible);
    }

    query.get().then((snapshot) => {
        if (!snapshot.empty) {
            firstVisible = snapshot.docs[0]; 
            lastVisible = snapshot.docs[snapshot.docs.length - 1];

            snapshot.forEach((doc) => {
                const postId = doc.id;
                const post = doc.data();

                const postElement = document.createElement('div');
                postElement.className = 'post';
                postElement.setAttribute('data-post-id', postId);
                postElement.innerHTML = `
                    <p>${post.text}</p>
                    <div class="vote-section">
                        <button onclick="vote('${postId}', 1)" class="vote-btn">
                            <i class="fa fa-thumbs-up"></i> Vote     
                        </button>
                        <span class="vote-count">${post.votes || 0}</span>
                    </div>
                `;
                postsContainer.appendChild(postElement);
            });

            updatePaginationControls(snapshot.size);
        } else {
            console.log("No more posts available.");
        }
    }).catch(error => {
        console.error("Error fetching posts:", error);
    });
}

function updatePaginationControls(postCount) {
    const paginationContainer = document.getElementById("pagination");
    paginationContainer.innerHTML = `
        <div class="pagination-controls">
            <button onclick="prevPage()" ${currentPage === 1 ? "disabled" : ""} class="pagination-btn">Previous</button>
            <span class="pagination-text"> Page ${currentPage} </span>
            <button onclick="nextPage()" ${postCount < pageSize ? "disabled" : ""} class="pagination-btn">Next</button>
        </div>
    `;
}


function nextPage() {
    currentPage++;
    loadPosts(currentPage);
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadPosts(currentPage);
    }
}

function vote(postId, change) {
    console.log('Voting on post:', postId);
    if (sessionStorage.getItem(postId)) {
        alert("You have already voted on this post.");
        return;
    }

    const postRef = db.collection("posts").doc(postId);
    postRef.update({
        votes: firebase.firestore.FieldValue.increment(change)
    })
    .then(() => {
        sessionStorage.setItem(postId, 'voted');
    })
    .catch(() => {
        alert("Failed to vote. Please try again.");
    });
}

function loadLeaderboard() {
    console.log('Loading leaderboard...');
    const topPostsContainer = document.getElementById('top-posts');
    topPostsContainer.innerHTML = '';

    db.collection("posts")
        .orderBy("votes", "desc")
        .limit(5)
        .get()
        .then((snapshot) => {
            snapshot.docs.forEach((doc) => {
                const post = doc.data();
                const postId = doc.id;

                const postSummaryElement = document.createElement('div');
                postSummaryElement.className = 'post-summary';
                postSummaryElement.innerHTML = `
                    <p>${post.text.substring(0, 50)}...</p>
                    <button onclick="viewPost('${postId}')">View Post</button>
                `;
                topPostsContainer.appendChild(postSummaryElement);
            });
        })
        .catch(error => {
            console.error('Error fetching leaderboard data:', error);
        });
}

function viewPost(postId) {
    window.location.href = `post.html?postId=${postId}`;
}

// Load posts and leaderboard on page load
window.onload = () => {
    loadPosts();
    loadLeaderboard();
};
// Set the contest end date (YYYY, MM (0-based), DD, HH, MM, SS)
const endDate = new Date("2025-03-01T00:00:00").getTime(); 

function updateCountdown() {
    const now = new Date().getTime();
    const timeLeft = endDate - now;

    if (timeLeft <= 0) {
        document.getElementById("countdown").innerHTML = "Contest Ended!";
        return;
    }

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    document.getElementById("countdown").innerHTML = 
        `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Update countdown every second
setInterval(updateCountdown, 1000);
updateCountdown(); // Initial call

