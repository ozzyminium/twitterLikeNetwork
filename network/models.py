from django.contrib.auth.models import AbstractUser
from django.db import models
from PIL import Image



class User(AbstractUser):
    bio = models.CharField(max_length=160)
    profile_image = models.ImageField(default="default_profile_400x400.png", upload_to="profile_images")
    profile_banner = models.ImageField(default="", upload_to="profile_banners")




class Posts(models.Model):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    text = models.CharField(max_length=280)
    timestamp = models.DateTimeField(auto_now_add=True)
    likeNumber = models.IntegerField(default=0)

    def serialize(self):
        return {
                "name": self.user.first_name+" "+self.user.last_name,
                "id": self.id,
                "username": self.user.username,
                "text": self.text,
                "timestamp": self.timestamp,
                "likeNumber": self.likeNumber,
                "userId": self.user.id
                }

    def __str__(self):
        return f"Id:{self.id}, {self.user} at {self.timestamp}"

class Comments(models.Model):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    post = models.ForeignKey("Posts", on_delete=models.CASCADE)
    text = models.CharField(max_length=280)
    timestamp = models.DateTimeField(auto_now_add=True)

class Likes(models.Model):
    user = models.ForeignKey("User", on_delete=models.CASCADE)
    post = models.ForeignKey("Posts", on_delete=models.CASCADE)
    timestamp = models.DateTimeField(auto_now_add=True)

    def serialize(self):
        return {
                "name": self.user.first_name+" "+self.user.last_name,
                "user_id": self.user.id,
                "username": self.user.username,
                "timestamp": self.timestamp
                }

    def __str__(self):
        return f"{self.id}, {self.user.username} liked {self.post.id}"


class Followers(models.Model):
    follower = models.ForeignKey("User", on_delete=models.CASCADE,related_name="following")
    user = models.ForeignKey("User", on_delete=models.CASCADE, related_name="followers")
    timestamp = models.DateTimeField(auto_now_add=True)
        
    def __str__(self):
        return f"{self.follower} is following {self.user}"
    

