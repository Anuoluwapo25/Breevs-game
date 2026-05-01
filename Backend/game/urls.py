from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GameViewSet, GameSummaryViewSet

router = DefaultRouter()
router.register(r'games', GameViewSet, basename='games')
router.register(r'summaries', GameSummaryViewSet, basename='summaries')


urlpatterns = [
    path('', include(router.urls)),
]