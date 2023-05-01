import React, { useState, useEffect, useReducer, useRef, useContext} from 'react';
import ReactDOM from 'react-dom'

const HomeContext = React.createContext(null);
const HomeDispatchContext = React.createContext(null);


// It takes a date in ISO 8601 format and returns a date or how much time has 
// elapsed in a convenient format.
function timeFormat(postdate) {
    const currentDate = new Date();
    const postDate = new Date(postdate);
    const day = postDate.getDate();
    const month = postDate.toLocaleString("default", { month: "short"});
    const year = postDate.getFullYear();
    const timeDiff = currentDate - postDate;

    if (timeDiff < 60000) {
        return (`${Math.floor(timeDiff/1000)}s`)
    }
    else if (timeDiff < 3600000) {
        return (`${Math.floor(timeDiff/60000)}m`)
    }
    else if (timeDiff <86400000) {
        return (`${Math.floor(timeDiff/3600000)}h`)
    }
    else if (timeDiff < 31536000000) {
        return (`${day} ${month}`)
    }
    else {
        return (`${day} ${month} ${year}`)
    }
}

// Acquiring the CSRF token from the cookie.
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function reducer(homeInfo, action) {
    switch (action.type) {
        case "setContentType": {
            return {
                ...homeInfo,
                contentType: action.payload,
            }
        }
        case "setInfo": {
            return {
                ...homeInfo,
                info: action.payload
            }
        }
        case "setIsAuth": {
            return {
                ...homeInfo,
                isAuth: action.payload
            }
        }
        case "setPosts": {
            return {
                ...homeInfo,
                posts: action.payload
            }
        }
        case "setPostCount": {
            return {
                ...homeInfo,
                postCount: action.payload
            }
        }
        case "setFav": {
            return {
                ...homeInfo,
                posts: action.payload
            }
        }
    }
}

// To determine which drop down menu to return for the ThreeDotsDropdown component.
// If three dots menu is clicked by that particular post's author, it lists buttons to
// edit and delete.
function ThreeDotsSelect({ postId, handleDelete, username }) {
    const homeInfo = useContext(HomeContext);
    if(homeInfo.info.username === username) {
        return(
            <React.Fragment>
                <li>
                    <button 
                        class="dropdown-item" 
                        type="button"
                        data-bs-toggle="modal"
                        data-bs-target={`#post${postId}`}
                    >
                        Edit
                    </button>
                </li>
                <li>
                    <button 
                        class="dropdown-item" 
                        type="button"
                        onClick={handleDelete}
                    >
                        Delete
                    </button>
                </li>
            </React.Fragment>
        );
    }
    else {
        return(
            <li>
                <button 
                    class="dropdown-item" 
                    type="button"
                >
                    Empty
                </button>
            </li>
        );
    }
}

// Three dots menu to list buttons for deleting and editing the posts.
function ThreeDotsDropdown({ postId, handleDelete, username}) {
    const dotRef = useRef();
    
    const threeDotsIcon =   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
                                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                            </svg>;

    // To change three dots icon's styling during the hover.
    const handleMouseEnter = () => {
        if(window.screen.width >= 1200) {
            const iconEffectContainer = dotRef.current.querySelector(".icon-effect-container");
            iconEffectContainer.style.backgroundColor = "rgba(29, 155, 240, 0.1)";
            iconEffectContainer.style.color = "rgba(29, 155, 240)";
        }
    }
    const handleMouseLeave = () => {
        if(window.screen.width >= 1200) {
            const iconEffectContainer = dotRef.current.querySelector(".icon-effect-container");
            iconEffectContainer.style.backgroundColor = "";
            iconEffectContainer.style.color = "";
        }
    }

    return(
        <div className="dropdown">
            <div 
                ref={dotRef} 
                className="d-flex dot-container"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                data-bs-toggle="dropdown"
            >
                <div className="icon-effect-container">
                    {threeDotsIcon}
                </div>
            </div>
            <ul class="dropdown-menu">
                <ThreeDotsSelect 
                    postId={postId}
                    handleDelete={handleDelete}
                    username={username}
                />
            </ul>
            <EditModal 
                postId={postId}
            />
        </div>
    );
}

// To show a modal to update selected post's content. Returns modal's 
// content and contains the logic to update the post at the backend. 
// If response from the backend is ok it updates the DOM.
function EditModal({ postId}) {
    const homeInfo = useContext(HomeContext)
    const homeDispatch = useContext(HomeDispatchContext)
    const [textValue, setTextValue] = useState(homeInfo.posts[postId].text)
    const editedPost={text: textValue};
    const csrftoken = getCookie('csrftoken');

    const handleSubmit = (e) => {
        const request = new Request(
            `/posts/${homeInfo.posts[postId].id}`,
            {headers: {'X-CSRFToken': csrftoken}}
        );

        fetch(request, {
            method: "PUT",
            mode: 'same-origin',
            body: JSON.stringify(editedPost)
        })
            .then(response => {
                if(response.status === 403) {
                    return "Forbidden"
                }
                return response.json();
            })
            .then(result => {
                if (result.id){
                    const updatedPosts = homeInfo.posts.map(oldPost => {
                        if(oldPost.id === result.id) {
                            return result
                        }
                        else {
                            return oldPost
                        }
                    });
                    homeDispatch({
                        type:"setPosts",
                        payload:updatedPosts
                    });
                }
            });
        e.preventDefault()
    }
    
    const handleChange = (e) => {
        setTextValue(e.target.value)
    }

    return(
        <div 
            class="modal fade" 
            id={`post${postId}`}
            tabindex="-1" 
            aria-labelledby="editmodal" 
            aria-hidden="true"
            data-bs-backdrop="static" 
            data-bs-keyboard="false"
        >
            <div class="modal-dialog">
                <div class="modal-content">
                    <form onSubmit={handleSubmit}>
                        <div class="modal-header">
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <textarea 
                                maxlength="280"
                                placeholder="Type something."
                                value={textValue} 
                                onChange={handleChange}
                                className="textarea-content"
                                required
                            >
                            </textarea>
                        </div>
                        <div class="modal-footer">
                            <input 
                                type="submit" 
                                class="btn btn-primary" 
                                value="Save changes" 
                                data-bs-dismiss="modal"
                            />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Header for posts. It contains name, username, publish date and dropdown menu.
function PostContentHeader({ postId, username }) {
    const csrftoken = getCookie('csrftoken');
    const homeInfo = useContext(HomeContext)
    const homeDispatch = useContext(HomeDispatchContext)
    const request = new Request(
        `/posts/${homeInfo.posts[postId].id}`,
        {headers: {'X-CSRFToken': csrftoken}}
    );
    
    // const handleEdit = () => {
    // }

    const handleDelete = () => {
        fetch(request, {
            method: "DELETE",
            mode: 'same-origin',
        })
            .then(response => {
                if (response.ok){
                    homeDispatch({
                        type: "setPosts", 
                        payload: homeInfo.posts.filter(x => x.id !==homeInfo.posts[postId].id)
                    });
                    homeDispatch({
                        type: "setPostCount", 
                        payload: homeInfo.postCount-1
                    });
                }
                else if(response.status === 403) {
                    return "Forbidden"
                }
                return response.ok
            })
            .then(result => console.log(result));
    }

    return(
        <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex">
                <div>
                    <a href={`/${homeInfo.posts[postId].username}`}className="text-decoration-none">
                        <div className="d-flex">
                            <div>
                                <span className="name-font">{homeInfo.posts[postId].name}</span>
                            </div>
                            <div>
                                <span className="username-font ps-1">
                                    {`@${homeInfo.posts[postId].username}`}
                                </span>
                            </div>
                        </div>
                    </a>
                </div>
                <div>
                    <span className="ps-2 pe-2">·</span>
                </div>
                <div className="fs-6 gray-color">
                    {timeFormat(homeInfo.posts[postId].timestamp)}
                </div>
            </div>
            <ThreeDotsDropdown 
                postId={postId}
                handleDelete={handleDelete}
                username={username}
            />
        </div>
    );
}

// Footer for the posts. It contains favicon, favcount. It also has 
// the necessary logic to like or unlike a post.
function PostContentFooter({ heartIcon, setHeartIcon, heart, heartFill, postId}) {
    const homeInfo = useContext(HomeContext)
    const homeDispatch = useContext(HomeDispatchContext)
    const favNumber = homeInfo.posts[postId].likeNumber;
    const favRef = useRef();
    const post = {post_id: homeInfo.posts[postId].id};
    const csrftoken = getCookie('csrftoken');
    
    useEffect(() => {
        handleIconStatus();
    }, []
    );
    // To change favicon and fav count's styling.
    const handleIconStatus = () => {
        if (homeInfo.posts[postId].is_faved === "true") {
            favRef.current.classList.add("test-red-color");
            setHeartIcon(heartFill)
        }
    }

    // To Like a post and change its render on the page.
    const handleLikePost = (e) => {
        const request = new Request(
            "/users/likes",
            {headers: {'X-CSRFToken': csrftoken}}
        );

        fetch(request, {
            method: "POST",
            mode: 'same-origin',
            body: JSON.stringify(post)
        })
            .then(response => {
                if (response.ok) {
                    const updatedPosts = homeInfo.posts.map(post => {
                        if (post.id === homeInfo.posts[postId].id) {
                            post.likeNumber = post.likeNumber+1;
                            post.is_faved="true"
                            return post;
                        }
                        return post;
                    });
                    homeDispatch({
                        type:"setFav",
                        payload: updatedPosts
                    });
                    setHeartIcon(heartFill)
                    favRef.current.classList.add("test-red-color");
                    return response.json();
                }
                return "Error"
            })
            .then(result => console.log(result));
    }
    
    // To unlike a post and change its render on the page.
    const handleUnlikePost = (e) => {
        const request = new Request(
            `/users/likes/${post.post_id}`,
            {headers: {'X-CSRFToken': csrftoken}}
        );

        fetch(request, {
            method: "DELETE",
            mode: 'same-origin',
        })
            .then(response => {
                if (response.ok) {
                    const updatedPosts = homeInfo.posts.map(post => {
                        if (post.id === homeInfo.posts[postId].id) {
                            post.likeNumber = post.likeNumber-1;
                            post.is_faved="false"
                            return post;
                        }
                        return post;
                    });
                    setHeartIcon(heart)
                    favRef.current.classList.remove("test-red-color");
                    return response.json();
                }
                return "Error"
            })
            .then(result => console.log(result));
    }
    
    // To change favicons and fav count's styling during the hover.
    const handleMouseEnter = () => {
        if(window.screen.width >= 1200) {
            const iconEffectContainer = favRef.current.querySelector(".icon-effect-container");
            const favCountContainer = favRef.current.querySelector(".fav-count");
            iconEffectContainer.style.backgroundColor = "rgba(249, 24, 128, 0.1)";
            iconEffectContainer.style.color = "rgba(249, 24, 128)";
            favCountContainer.style.color = "rgba(249, 24, 128)";
        }
    }
    const handleMouseLeave = () => {
        if(window.screen.width >= 1200) {
            const iconEffectContainer = favRef.current.querySelector(".icon-effect-container");
            const favCountContainer = favRef.current.querySelector(".fav-count");
            iconEffectContainer.style.backgroundColor = "";
            iconEffectContainer.style.color = "";
            favCountContainer.style.color = "";
        }
    }

    return(
        <div onClick={homeInfo.posts[postId].is_faved==="true" ? handleUnlikePost : handleLikePost} 
            ref={favRef} 
            className="fav-container"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="icon-effect-container">
                {heartIcon}
            </div>
            <div className="d-flex align-items-center gray-color">
                <span className="fav-count">{favNumber}</span>
            </div>
        </div>
    );
}

// Creates a post with given JSON content.
function PostContainer({ postId, username }) {
    const homeInfo = useContext(HomeContext)
    const homeDispatch = useContext(HomeDispatchContext)
    const heart =   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                        <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"></path>
                    </svg>;
    const heartFill =   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" class="bi bi-heart-fill" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M8 1.314C12.438-3.248 23.534 4.735 8 15-7.534 4.736 3.562-3.248 8 1.314z"/>
                        </svg>;
    const [heartIcon, setHeartIcon] = useState(heart);
    return(
        <div className="post-container">
            <div className="profile-image-container">
                <div className="img-cont">
                    <a href={homeInfo.posts[postId].username}>
                        <img src={homeInfo.posts[postId].profile_image} 
                            width="48" height="48" class="rounded-circle"
                        />
                    </a>
                </div>
            </div>
            <div className="post-content-container">
                <div>
                    <PostContentHeader 
                        postId={postId}
                        username={username}
                    />
                </div>
                <div >
                    <p className="text-break">{homeInfo.posts[postId].text}</p>
                </div>
                <div className="d-flex">
                    <PostContentFooter 
                        heartIcon={heartIcon}
                        setHeartIcon={setHeartIcon}
                        heart={heart}
                        heartFill={heartFill}
                        postId={postId}
                        postId={postId}
                    />
                </div>
            </div>
        </div>
    );
}

// To create a section for sending posts. It return necessary layout and contains 
// the logic to save the post at the backend. If the response from the backend is OK  
// it updates the DOM.
function SendPost() {
    const textRef = useRef();
    const [textValue, setTextValue] = useState();
    const csrftoken = getCookie('csrftoken');
    const homeInfo = useContext(HomeContext)
    const homeDispatch = useContext(HomeDispatchContext)

    const handleSubmit = (e) => {
        const post = {text: textValue};
        const request = new Request(
            "/posts",
            {headers: {'X-CSRFToken': csrftoken}}
        );

        fetch(request, {
            method: "POST",
            mode: 'same-origin',
            body: JSON.stringify(post)
        })
            .then(response => response.json())
            .then(result => {
                if (result.post.id) {
                    homeDispatch({
                        type: "setPosts",
                        payload: [result.post, ...homeInfo.posts]
                    });
                    homeDispatch({
                        type: "setPostCount",
                        payload: homeInfo.postCount+1
                    });
                }
            });
        setTextValue("")
        e.preventDefault()
    }
    const handleChange = (e) => {
        setTextValue(e.target.value); 
        const textAreaElement = textRef.current.querySelector("textarea");
        textRef.current.style.height = textAreaElement.scrollHeight + "px";
    }
    console.log(homeInfo)
    return(
        <div className="d-flex flex-column">
            <div className="d-flex text-container-5">
                <span>Home</span>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="d-flex mt-3">
                    <div className="d-flex pe-3 img-cont">
                        <img src={homeInfo.info.profile_image}
                        width="48" height="48" class="rounded-circle"
                        />
                    </div>
                    <div ref={textRef} className="flex-grow-1">
                        <textarea 
                            maxlength="280"
                            placeholder="What's happening?"
                            value={textValue} 
                            onChange={handleChange}
                            className="textarea-content"
                            required
                        >
                        </textarea>
                    </div>
                </div>
                <div className="d-flex justify-content-end">
                    <input type="submit" className="btn btn-primary" value="Post" />
                </div>
            </form>
        </div>
    );
}

// Component that contains profile name, username, bio, join date, following and 
// follower count
function HomeInfo() {
    const homeInfo = useContext(HomeContext)
    const calendarIcon =<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-calendar" viewBox="0 0 16 16">
                            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                        </svg>
    const name = homeInfo.info.first_name+" "+homeInfo.info.last_name;
    const dateJoined = new Date(homeInfo.info.date_joined)
    const year = dateJoined.getFullYear();
    const month = dateJoined.toLocaleString("default", { month: "long"});
    const date = `Joined ${month} ${year}`;

    return(
        <div className="d-flex flex-column">
            <div className="d-flex flex-column mt-2 mb-3">
                <div className="info-name-text">
                    {name}
                </div>
                <div className="gray-color">
                    @{homeInfo.info.username}
                </div>
            </div>
            <div className="mb-2">
                <span>{homeInfo.info.bio}</span>
            </div>
            <div className="d-flex mb-1">
                <div className="d-flex align-items-center gray-color me-2">
                    <div>
                        {calendarIcon}
                    </div>
                </div>
                <div className="gray-color">
                    {date}
                </div>
            </div>
            <div className="d-flex">
                <div className="d-flex">
                    <div className="me-1 info-num">
                        {homeInfo.info.followingCount}
                    </div>
                    <div className="me-4 info-fol">
                        Following
                    </div>
                </div>
                <div className="d-flex">
                    <div className="me-1 info-num">
                        {homeInfo.info.followerCount}
                    </div>
                    <div className="info-fol">
                        Followers
                    </div>
                </div>
            </div>
        </div>
    )
}

// Returns the posts in an array for authenticated user's home timeline
function HomeTimeline() {
    const homeInfo = useContext(HomeContext);
    const postElements = [];
    if(homeInfo.isAuth === "true") {
        for(let i=0; i<homeInfo.posts.length; i++) {
            postElements.push(
                <PostContainer 
                    key={homeInfo.posts[i].id}
                    postId={i}
                    username={homeInfo.posts[i].username}
                />
            )
        }
    }
    return postElements;
}

// Dropdown menu content for authenticated users. It contains home, profile
// and log out links.
function MiniDots(){
    const authUser = document.querySelector("#root").dataset.authuser;
    return(
        <React.Fragment>
            <li>
                <a className="dropdown-item" href="home">Home</a>
            </li>
            <li>
                <a className="dropdown-item" href={authUser}>Profile</a>
            </li>
            <li>
                <a className="dropdown-item" href="logout">Log Out</a>
            </li>
        </React.Fragment>
    );
}

// A mini banner to show at the top of the page for devices with narrow screen width.
function MiniBannerSelect() {
    const dotRef = useRef();
    const homeInfo = useContext(HomeContext)
    const threeDotsIcon =   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
                                <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                            </svg>;

    // To change three dots icon's styling during the hover.
    const handleMouseEnter = () => {
        if(window.screen.width >= 1200) {
            const iconEffectContainer = dotRef.current.querySelector(".icon-effect-container");
            iconEffectContainer.style.backgroundColor = "rgba(29, 155, 240, 0.1)";
            iconEffectContainer.style.color = "rgba(29, 155, 240)";
        }
    }
    const handleMouseLeave = () => {
        if(window.screen.width >= 1200) {
            const iconEffectContainer = dotRef.current.querySelector(".icon-effect-container");
            iconEffectContainer.style.backgroundColor = "";
            iconEffectContainer.style.color = "";
        }
    }
    return(
        <div className="mini-banner">
            <div className="upper-banner">
                <div className="banner-logo">
                    <a href="/">network</a>
                </div>
                <div className="dropdown d-flex align-items-center">
                    <div 
                        ref={dotRef} 
                        className="d-flex dot-container"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                        data-bs-toggle="dropdown"
                    >
                        <div className="icon-effect-container">
                            {threeDotsIcon}
                        </div>
                    </div>
                    <ul class="dropdown-menu">
                        <MiniDots />
                    </ul>
                </div>
            </div>
        </div>
    );
    
}

// Center content that contains the send post section and home timeline.
// It also contains the mini banner to show at the top of the page for 
// devices with narrow screen width.
function CenterContent() {
    return(
        <div className="center-section">
            <div className="">
                <MiniBannerSelect />
            </div>
            <div className="post-container-roof p-3">
                <SendPost />
            </div>
            <div className="post-section">
                <HomeTimeline />
            </div>
        </div>
    );
}

// Section with signup link and associated information for unauthenticated users.
function SideContent() {
    return(
        <div></div>
    );
}

// It contains the icon of the app.
function AppIcon() {

    return(
        <a href="/" className="d-flex nav-font">
            <div className="d-flex p-2 ">
                <div className="ms-3 me-3 app-icon">
                    <span>network</span>
                </div>
            </div>
        </a>
    );
}

// Button component for generating navbar links.
function NavbarButton({ icon, name }) {
    const authUser = document.querySelector("#root").dataset.authuser;
    let link ="";
    if(name === "Home") {
        link = "home";
    }
    else if(name === "Profile") {
        link = authUser;
    }
    else if(name === "Log Out") {
        link = "logout";
    }

    return(
        <a href={link} className="d-flex nav-font">
            <div className="d-flex p-2 ">
                <div className="d-flex align-items-center">
                    {icon}
                </div>
                <div className="ms-3 me-3 ">
                    <span>{name}</span>
                </div>
            </div>
        </a>
    );
}

// Navbar of the page.
function Navbar() {
    const loginIcon =   <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="rgb(15, 20, 25)" class="bi bi-box-arrow-in-right" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M6 3.5a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 0-1 0v2A1.5 1.5 0 0 0 6.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-8A1.5 1.5 0 0 0 5 3.5v2a.5.5 0 0 0 1 0v-2z"/>
                            <path fill-rule="evenodd" d="M11.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H1.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3z"/>
                        </svg>;
    const hashIcon =    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="rgb(15, 20, 25)"  viewBox="0 0 16 16">
                            <path d="M8.39 12.648a1.32 1.32 0 0 0-.015.18c0 .305.21.508.5.508.266 0 .492-.172.555-.477l.554-2.703h1.204c.421 0 .617-.234.617-.547 0-.312-.188-.53-.617-.53h-.985l.516-2.524h1.265c.43 0 .618-.227.618-.547 0-.313-.188-.524-.618-.524h-1.046l.476-2.304a1.06 1.06 0 0 0 .016-.164.51.51 0 0 0-.516-.516.54.54 0 0 0-.539.43l-.523 2.554H7.617l.477-2.304c.008-.04.015-.118.015-.164a.512.512 0 0 0-.523-.516.539.539 0 0 0-.531.43L6.53 5.484H5.414c-.43 0-.617.22-.617.532 0 .312.187.539.617.539h.906l-.515 2.523H4.609c-.421 0-.609.219-.609.531 0 .313.188.547.61.547h.976l-.516 2.492c-.008.04-.015.125-.015.18 0 .305.21.508.5.508.265 0 .492-.172.554-.477l.555-2.703h2.242l-.515 2.492zm-1-6.109h2.266l-.515 2.563H6.859l.532-2.563z"/>
                        </svg>;
    const homeIcon =    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-house" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M2 13.5V7h1v6.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V7h1v6.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13.5zm11-11V6l-2-2V2.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5z"/>
                            <path fill-rule="evenodd" d="M7.293 1.5a1 1 0 0 1 1.414 0l6.647 6.646a.5.5 0 0 1-.708.708L8 2.207 1.354 8.854a.5.5 0 1 1-.708-.708L7.293 1.5z"/>
                        </svg>;
    const profileIcon = <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-person" viewBox="0 0 16 16">
                            <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                        </svg> ;
    const logoutIcon = <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" class="bi bi-box-arrow-left" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M6 12.5a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-8a.5.5 0 0 0-.5.5v2a.5.5 0 0 1-1 0v-2A1.5 1.5 0 0 1 6.5 2h8A1.5 1.5 0 0 1 16 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 5 12.5v-2a.5.5 0 0 1 1 0v2z"/>
                            <path fill-rule="evenodd" d="M.146 8.354a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L1.707 7.5H10.5a.5.5 0 0 1 0 1H1.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3z"/>
                        </svg>
    
    return(
        <nav className="d-flex flex-column mt-2">
        <React.Fragment>
            <AppIcon />
            <NavbarButton icon = {homeIcon} name="Home"/>
            <NavbarButton icon = {profileIcon} name="Profile"/>
            <NavbarButton icon = {logoutIcon} name="Log Out"/>
        </React.Fragment>
        </nav>
    );
}

// Main section of the page. It contains posts, profile information and links.
function MainContent() {
    const homeInfo = useContext(HomeContext);    
    if(homeInfo.isAuth === "true") {
        return(
            <div className="main-content">
                <CenterContent />
                <SideContent />
            </div>
        );
    }
}

// Banner component that contains the navbar.
function Banner() {
    const homeInfo = useContext(HomeContext);
    if(homeInfo.isAuth === "true") {
        return(
            <div className="banner">
                <div className="d-flex flex-column">
                    <div className="d-flex flex-column">
                        <Navbar />
                    </div>
                </div>
            </div>
        );
    }
}

// App component.
function App() {
    const initObj = {}
    const userId = document.querySelector("#root").dataset.userid;
    const [homeInfo, homeDispatch] = useReducer(reducer, initObj);

    const handleFetchInfo = () => {
        fetch(`users/posts/following`,{
        method: "GET",
        mode: "same-origin"
    })
        .then(response => response.json())
        .then(result => {
            const obj = result.info;
            homeDispatch({type: "setInfo", payload: result.info});
            homeDispatch({type: "setIsAuth", payload: result.is_authenticated});
            homeDispatch({type: "setPosts", payload: result.posts});
            homeDispatch({type: "setPostCount", payload: result.postCount});
        });
    }
    
    useEffect(() => {
        handleFetchInfo();
    }, []);
    return (
        <div className="d-flex justify-content-center">
            <header role="banner" className="d-flex">
                <HomeContext.Provider value={homeInfo}>
                    <HomeDispatchContext.Provider value={homeDispatch}>
                        <Banner />
                    </HomeDispatchContext.Provider>
                </HomeContext.Provider>
            </header>
            <main role="main" className="d-flex">
                <HomeContext.Provider value={homeInfo}>
                    <HomeDispatchContext.Provider value={homeDispatch}>
                        <MainContent />
                    </HomeDispatchContext.Provider>
                </HomeContext.Provider>
            </main>
        </div>
    );
}
// Rendering the App component into div element with root id.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

