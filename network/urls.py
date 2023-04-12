from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("home", views.home_view, name="home"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("settings/profile", views.set_profile, name="setprofile"),

    # API Routes #########################################################################################

    # Create a new post
    path("posts", views.create_post, name="create_post"),

    # Edit or delete a post
    path("posts/<int:post_id>", views.manage_post, name="manage_post"),

    # Let the user to like a post with "post_id"
    path("users/likes", views.manage_likes, name="manage_likes"),

    # Let the user  to unlike a post with "post_id"
    path("users/likes/<int:post_id>", views.manage_unlike, name="manage_unlike"),

    # Allows a user to follow another user
    path("users/following", views.following, name="following"),

    # Allows a user to unfollow another user ID
    path("users/following/<int:user_id>", views.unfollowing, name="unfollowing"),

    # Access to posts published by the user with "user_id"
    path("users/<int:user_id>/posts", views.user_timeline, name="user_timeline"),

    # Returns the profile information and posts of the requested user as JSON
    path("users/<int:user_id>/info", views.user_info, name="user_info"),

    # Access to posts published by the authenticated user's following
    path("users/posts/following", views.home_info, name="home_info"),

    # Access to all posts
    path("users/posts", views.all_posts, name="all_posts"),

    # Query for the user's followings 
    path("users/<int:user_id>/following", views.lookup_user_following, name="lookup_user_following"),

    # Query for the user's followers
    path("users/<int:user_id>/followers", views.lookup_user_followers, name="lookup_user_followers"),

    ######################################################################################################

    # To access a user's profile with username
    path("<str:username>", views.profile_view, name="profile")
]
