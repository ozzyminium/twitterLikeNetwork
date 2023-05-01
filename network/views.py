import json
from django.core.paginator import Paginator
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django import forms
from PIL import Image
from PIL import UnidentifiedImageError
from django.utils.datastructures import MultiValueDictKeyError
from .models import User, Posts, Likes, Followers


#To render requested user's home page
@login_required
def home_view(request):
    # Query for requested user
    try:
        user_profile = User.objects.get(username=request.user.username)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found."}, status=404)


    if request.method == "GET":
        return render(request, "network/home.html",{
            "user_profile": user_profile,
            })
    else:
        return JsonResponse({"error": "Request is not GET."}, status=403)


# Access to posts published by the authenticated user's following as JSON
@login_required
def home_info(request):
    if request.method == "GET":
        user = request.user
        following = [user.id]
        for f in Followers.objects.filter(follower__id=user.id):
            following.append(f.user.id)
        posts = Posts.objects.filter(user_id__in=following).order_by('-timestamp')
        postCount = len(posts)
        jsonPost = []
        info = {}
        jsonHome = {}
        following = "true"

        for post in posts:
            try:
                Likes.objects.get(post=post,user=request.user)
            except Likes.DoesNotExist:
                fav = "false"
            else:
                fav = "true"

            postSerialized = {}
            postSerialized["name"] = post.user.first_name+" "+post.user.last_name
            postSerialized["id"] = post.id
            postSerialized["username"] = post.user.username
            postSerialized["text"] = post.text
            postSerialized["timestamp"] = post.timestamp
            postSerialized["likeNumber"] = post.likeNumber
            postSerialized["is_faved"] = fav
            postSerialized["profile_image"] = post.user.profile_image.url
            jsonPost.append(postSerialized)
        jsonHome["postCount"] = postCount
        jsonHome["posts"] = jsonPost
        jsonHome["is_authenticated"] = "true"
        info["id"] = user.id
        info["first_name"] = user.first_name
        info["last_name"] = user.last_name
        info["username"] = user.username
        info["profile_image"] = user.profile_image.url

        jsonHome["info"] = info
            
        return JsonResponse(jsonHome, safe=False)
    else:
        return JsonResponse({"error": "Http request method must be 'GET'."}, status=404)


def resizeProfileImage(img):
    if img.height > 400 or img.width > 400:
        output_size = (400, 400)
        img.thumbnail(output_size)
        img.save(self.profile_image.path)


# To upload/update profile picture, profile banner and profile information
@login_required
def set_profile(request):
    if request.method == "GET":
        content = {}
        content["profile_image"] = request.user.profile_image.url
        content["bio"] = request.user.bio
        content["email"] = request.user.email
        try:
            content["profile_banner"] = request.user.profile_banner.url
        except:
            content["profile_banner"] = ""
        return render(request, "network/setprofile.html", {
            "content": content
            })
    elif request.method == "POST":
        user = request.user
        content = {}
        content["profile_image"] = request.user.profile_image.url
        content["bio"] = request.user.bio
        content["email"] = request.user.email
        try:
            content["profile_banner"] = request.user.profile_banner.url
        except:
            content["profile_banner"] = ""

        # To check if the uploaded file is an image or if it is uploaded
        try:
            profile_image = Image.open(request.FILES["profile_image"].file)
        except UnidentifiedImageError:
            content["message"] = "Unsupported media type"
            return render(request, "network/setprofile.html", {
                "content": content
                })
        except MultiValueDictKeyError:
            profImageIsUploaded = False
        else:
            profImageIsUploaded = True

        try:
            profile_banner = Image.open(request.FILES["profile_banner"].file)
        except UnidentifiedImageError:
            content["message"] = "Unsupported media type"
            return render(request, "network/setprofile.html", {
                "content": content
                })
        except MultiValueDictKeyError:
            profBannerIsUploaded = False
        else:
            profBannerIsUploaded = True

        if profBannerIsUploaded:
            user.profile_banner = request.FILES["profile_banner"]

        if profImageIsUploaded:
            user.profile_image = request.FILES["profile_image"]

        user.bio = request.POST["bio"]
        user.email = request.POST["email"]
        user.save()

        return HttpResponseRedirect(reverse("home"))


def index(request):
    if request.method == "POST":
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/index.html")


def login_view(request):
    if request.user.is_authenticated:
        return HttpResponseRedirect(reverse("home"))

    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("home"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


# To render the sign up page and create a new account
def register(request):
    if request.user.is_authenticated:
        return HttpResponseRedirect(reverse("home"))

    if request.method == "POST":
        name = request.POST["name"].split(" ")

        #To register with multiple names
        if len(name)>1:
            first_name = ""
            name_list = name[0:len(name) - 1]
            last_name = name[len(name) - 1]
            for i in range(len(name_list)):
                if i == len(name_list) - 1:
                    first_name += name_list[i]
                else:
                    first_name = first_name + name_list[i] + " "
        else:
            first_name = name[0]
            last_name = ""

        bio = request.POST["bio"]
        username = request.POST["username"]
        email = request.POST["email"]

        # Check if username is valid
        if len(username.split(" ")) > 1:
            return render(request, "network/register.html", {
                "message": "Username cannot contain whitespace characters."
            })
        elif not username.isalnum():
            return render(request, "network/register.html", {
                "message": "Username cannot contain special characters."
            })

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.first_name = first_name
            user.last_name = last_name
            user.bio = bio
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")


# Returns the profile information and posts of the requested user as JSON
def user_info(request,user_id):
    
    jsonProfile = {}
    jsonPost = []
    info = {}
    following = "false"

    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"})
    
    posts = Posts.objects.filter(user=user).order_by('-timestamp')
    postCount = len(posts)
    followerCount = Followers.objects.filter(user=user_id).count()
    followingCount = Followers.objects.filter(follower=user_id).count()

    jsonProfile["postCount"] = postCount

    for post in posts:
        if request.user.is_authenticated:
            try:
                Likes.objects.get(post=post,user=request.user)
            except Likes.DoesNotExist:
                fav = "false"
            else:
                fav = "true"
        else:
            fav = "false"
        postSerialized = {}
        postSerialized["name"] = post.user.first_name+" "+post.user.last_name
        postSerialized["id"] = post.id
        postSerialized["username"] = post.user.username
        postSerialized["text"] = post.text
        postSerialized["timestamp"] = post.timestamp
        postSerialized["likeNumber"] = post.likeNumber
        postSerialized["is_faved"] = fav
        postSerialized["profile_image"] = user.profile_image.url
        jsonPost.append(postSerialized)
        
    jsonProfile["posts"] = jsonPost

    if request.user.is_authenticated:
        querySetLen = Followers.objects.filter(user=user_id, follower=request.user.id).count()
        if querySetLen == 1:
            following = "true"
        jsonProfile["is_authenticated"] = "true"
        if request.user.id == user.id:
            jsonProfile["contentType"] = "userProfile"
        else:
            jsonProfile["contentType"] = "profile"

    else:
        jsonProfile["is_authenticated"] = "false"
        jsonProfile["contentType"] = "profile"

    try:
        profile_banner = user.profile_banner.url
    except ValueError:
        profile_banner = None

    info["id"] = user.id
    info["first_name"] = user.first_name
    info["last_name"] = user.last_name
    info["username"] = user.username
    info["bio"] = user.bio
    info["date_joined"] = user.date_joined
    info["postCount"] = postCount
    info["followerCount"] = followerCount 
    info["followingCount"] = followingCount
    info["following"] = following
    info["profile_image"] = user.profile_image.url
    info["profile_banner"] = profile_banner

    jsonProfile["info"] = info

    return JsonResponse(jsonProfile, safe=False)

# To access a user's profile with username
def profile_view(request, username):

    # Query for requested user
    try:
        user_profile = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found."}, status=404)

    if request.user.is_authenticated:

        # Checkes if user follows the requested profile
        try:
            Followers.objects.get(follower=request.user, user=user_profile)
        except Followers.DoesNotExist:
            is_followed = "false"
        else:
            is_followed = "true"
        
        # Checkes if requested profile belongs to user
        if request.user.id == user_profile.id:
            is_ownProfile = "true"
        else:
            is_ownProfile = "false"

    else:
        is_followed = "false"
        is_ownProfile = "false"

    if request.method == "GET":
        return render(request, "network/profile.html",{
            "user_profile": user_profile,
            "is_followed": is_followed,
            "is_ownProfile": is_ownProfile
            })


# Create a new post
@login_required
def create_post(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    data = json.loads(request.body)
    user = request.user
    p = Posts(
            user=user,
            text=data["text"],
        )
    p.save()
    postCount = len(Posts.objects.all())
    recentPost = Posts.objects.filter(user=user).order_by("-timestamp")[0];
    return JsonResponse({
        "postCount": postCount,
        "post":{
            "name": user.first_name+" "+user.last_name,
            "username":user.username,
            "id": recentPost.id,
            "text": recentPost.text,
            "likeNumber": recentPost.likeNumber,
            "timestamp": recentPost.timestamp,
            "is_faved": "false",
            "userId": recentPost.user.id,
            "profile_image": user.profile_image.url 
            }

        }, status=201);
    

# Edit or delete a post
@login_required
def manage_post(request, post_id):

    user = request.user

    try:
        post = Posts.objects.get(pk=post_id)
    except Posts.DoesNotExist:
        return JsonResponse({"error": "Post not found."}, status=404)

    if post.user.id != user.id:
        return JsonResponse({"error": "User is not authorized"}, status=401)
    elif request.method == "PUT":
        data = json.loads(request.body)
        post.text = data["text"]
        post.save()
        updatedPost = Posts.objects.get(pk=post_id)
        try:
            Likes.objects.get(post=post,user=user)
        except Likes.DoesNotExist:
            fav = "false"
        else:
            fav = "true"

        return JsonResponse({
                            "name": user.first_name+" "+user.last_name,
                            "id": updatedPost.id,
                            "username":user.username,
                            "text": updatedPost.text,
                            "timestamp": updatedPost.timestamp,
                            "likeNumber": updatedPost.likeNumber,
                            "is_faved": fav,
                            "profile_image": user.profile_image.url

                            }, status=201);
    elif request.method == "DELETE":
        post.delete()
        return HttpResponse(status=204)
    else:
        return JsonResponse({"error": "HTTP request method must be 'PUT' or 'DELETE'."}, status=404)


# Let the user to like a post with "post_id"
@login_required
def manage_likes(request):
    if request.method == "POST":
        data = json.loads(request.body)
        post_id = int(data["post_id"])
        user = request.user

        try:
            post = Posts.objects.get(pk=post_id)
        except Posts.DoesNotExist:
            return JsonResponse({"error": "Post not found."}, status=404)

        try:
            l = Likes.objects.get(user=user,post=post)
        except Likes.DoesNotExist:
            l = Likes(user=user,post=post)
        else:
            return JsonResponse({"error": "The post has been already liked by the user."}, status=404)

        l.save()
        likeNumber = Likes.objects.filter(post=post).count()
        post.likeNumber = likeNumber
        post.save()

        return JsonResponse({"message": "Post liked successfully."}, status=201)
    else:
        return JsonResponse({"error": "Http method must be 'POST'."}, status=404)



# Let the user to unlike a post with "post_id"
@login_required
def manage_unlike(request, post_id):
    if request.method == "DELETE":
        user = request.user

        try:
            post = Posts.objects.get(pk=post_id)
        except Posts.DoesNotExist:
            return JsonResponse({"error": "Post not found."}, status=404)

        try:
            l = Likes.objects.get(user=user,post=post)
        except Likes.DoesNotExist:
            return JsonResponse({"message": "Post was unliked."}, status=404)

        l.delete()
        likeNumber = Likes.objects.filter(post=post).count()
        post.likeNumber = likeNumber
        post.save()

        return JsonResponse({"message": "Post unliked successfully."}, status=201)
    else:
        return JsonResponse({"error": "Http method must be 'DELETE'."}, status=404)

# Access to posts published by the authenticated user's following
@login_required
def following_timeline(request):
    if request.method == "GET":
        
        user = request.user
        following = []
        for f in Followers.objects.filter(follower__id=user.id):
            following.append(f.user.id)
        posts = Posts.objects.filter(user_id__in=following).order_by('-timestamp')
        postCount = len(posts)
        jsonPost = []
        jsonTline = {}
        jsonTline["postCount"] = postCount
        pageNum = request.GET.get("page", 1)
        paginator = Paginator(posts, 10)
        page_obj = paginator.get_page(pageNum)

        for post in page_obj.object_list:
            try:
                Likes.objects.get(post=post,user=request.user)
            except Likes.DoesNotExist:
                fav = "false"
            else:
                fav = "true"

            postSerialized = {}
            postSerialized["name"] = post.user.first_name+" "+post.user.last_name
            postSerialized["id"] = post.id
            postSerialized["username"] = post.user.username
            postSerialized["text"] = post.text
            postSerialized["timestamp"] = post.timestamp
            postSerialized["likeNumber"] = post.likeNumber
            postSerialized["is_faved"] = fav
            postSerialized["userId"] = post.user.id
            postSerialized["num_pages"] = paginator.num_pages

            jsonPost.append(postSerialized)
            jsonTline["post"] = jsonPost
            
        return JsonResponse(jsonTline, safe=False)
    else:
        return JsonResponse({"error": "Http request method must be 'GET'."}, status=404)


# Access to posts published by the user with "user_id"
def user_timeline(request, user_id):
    if request.method == "GET":
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return JsonResponse({"error": "User does not exist."}, status=404)

        
        posts = Posts.objects.filter(user=user).order_by('-timestamp')
        jsonPost = []
        jsonUserTimeline = {}
        postCount = len(posts)
        jsonUserTimeline["postCount"] = postCount

        for post in posts:
            if request.user.is_authenticated:
                try:
                    Likes.objects.get(post=post,user=request.user)
                except Likes.DoesNotExist:
                    fav = "false"
                else:
                    fav = "true"
            else:
                fav = "false"

            postSerialized = {}
            postSerialized["name"] = post.user.first_name+" "+post.user.last_name
            postSerialized["id"] = post.id
            postSerialized["username"] = post.user.username
            postSerialized["text"] = post.text
            postSerialized["timestamp"] = post.timestamp
            postSerialized["likeNumber"] = post.likeNumber
            postSerialized["is_faved"] = fav

            jsonPost.append(postSerialized)
            jsonUserTimeline["post"] = jsonPost
            
        return JsonResponse(jsonUserTimeline, safe=False)
    else:
        return JsonResponse({"error": "Http request method must be 'GET'."}, status=404)


# Access to all posts
def all_posts(request):
    if request.method == "GET":

        try:
            posts = Posts.objects.all().order_by('-timestamp')
        except Posts.DoesNotExist:
            return JsonResponse({"error": "Posts can not be found."}, status=404)

        jsonPost = []
        postCount = len(posts)
        jsonHome = {}
        jsonHome["postCount"] = postCount

        for post in posts:
            if request.user.is_authenticated:
                try:
                    Likes.objects.get(post=post,user=request.user)
                except Likes.DoesNotExist:
                    fav = "false"
                else:
                    fav = "true"
            else:
                fav = "false"

            postSerialized = {}
            postSerialized["name"] = post.user.first_name+" "+post.user.last_name
            postSerialized["id"] = post.id
            postSerialized["username"] = post.user.username
            postSerialized["text"] = post.text
            postSerialized["timestamp"] = post.timestamp
            postSerialized["likeNumber"] = post.likeNumber
            postSerialized["is_faved"] = fav
            postSerialized["userId"] = post.user.id
            postSerialized["profile_image"] = post.user.profile_image.url

            jsonPost.append(postSerialized)

        jsonHome["post"] = jsonPost
        return JsonResponse(jsonHome, safe=False)
    else:
        return HttpResponse(status=404)


# Allows a user to follow another user
@login_required
def following(request):
    if request.method == "POST":
        follower = request.user
        data = json.loads(request.body)
        
        try:
            user = User.objects.get(pk=data["user_id"])
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found."}, status=404)

        try:
            f = Followers.objects.get(follower=follower,user=user)
        except Followers.DoesNotExist:
            f = Followers(follower=follower,user=user)
        else:
            return JsonResponse({"error": "User has been already followed."}, status=404)
            
        if follower.id == user.id:
            return JsonResponse({"error": "Users can not follow themselves."}, status=404)
        else:
            f.save()
            return JsonResponse({"message": "User followed successfully."}, status=201)


# Allows a user to unfollow another user ID
@login_required
def unfollowing(request, user_id):
    if request.method == "DELETE":
        follower = request.user

        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found."}, status=404)

        try:
            f = Followers.objects.get(follower=follower,user=user)
        except Followers.DoesNotExist:
            return JsonResponse({"message": "User was unfollowed."}, status=403)
        
        f.delete() 
        return JsonResponse({"message": "User unfollowed successfully."}, status=201)
    else:
        return JsonResponse({"error": "Http request method must be 'DELETE'."}, status=404)


# Query for the user's followings
def lookup_user_following(request, user_id):
    if request.method == "GET":
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found."}, status=404)

        followings = Followers.objects.filter(follower=user)
        return JsonResponse([following.user.serialize() for following in followings], safe=False)


# Query for the user's followers
def lookup_user_followers(request, user_id):
    if request.method == "GET":
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return JsonResponse({"error": "User not found."}, status=404)

        followers = Followers.objects.filter(user=user)
        return JsonResponse([follower.follower.serialize() for follower in followers], safe=False)


