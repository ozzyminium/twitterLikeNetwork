from django.contrib import admin
from .models import User, Posts, Comments, Likes, Followers

# Register your models here.
admin.site.register(User)
admin.site.register(Posts)
admin.site.register(Comments)
admin.site.register(Likes)
admin.site.register(Followers)
