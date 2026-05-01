from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class Player(models.Model):
    wallet_address = models.CharField(max_length=100, unique=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    eliminated = models.BooleanField(default=False)
    eliminated_round = models.IntegerField(null=True, blank=True)
    used_risk_mode = models.BooleanField(default=False)

    def __str__(self):
        return self.wallet_address

class Game(models.Model):
    game_id = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    current_round = models.IntegerField(default=1)
    prize_pool = models.DecimalField(max_digits=20, decimal_places=2)
    stake_amount = models.DecimalField(max_digits=20, decimal_places=2)
    winner_address = models.CharField(max_length=100, null=True, blank=True)
    is_completed = models.BooleanField(default=False)
    players = models.ManyToManyField(Player, related_name='games')



class GameEvent(models.Model):
    EVENT_TYPES = [
        ('player_survived', 'Player Survived'),
        ('player_eliminated', 'Player Eliminated'),
        ('shield_used', 'Shield Used'),
    ]
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=20, choices=EVENT_TYPES)
    player_address = models.CharField(max_length=100, null=True, blank=True)
    event_data = models.JSONField(default=dict)
    block_height = models.IntegerField()

    def __str__(self):
        return f"{self.get_event_type_display()} - Game {self.game.game_id}"


class GameCommentary(models.Model):
    """Real-time AI commentary for games in progress"""
    
    COMMENTARY_TYPES = [
        ('live', 'Live Commentary'),
        ('prediction', 'Prediction'),
        ('analysis', 'Analysis'),
        ('highlight', 'Highlight')
    ]
    
    game = models.ForeignKey('Game', on_delete=models.CASCADE, related_name='commentaries')
    round_number = models.IntegerField()
    commentary_text = models.TextField()
    commentary_type = models.CharField(max_length=20, choices=COMMENTARY_TYPES, default='live')
    
    tension_level = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Drama/tension level from 1-10"
    )
    context_data = models.JSONField(default=dict, help_text="Supporting context for this commentary")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'Game commentaries'
        indexes = [
            models.Index(fields=['game', 'round_number']),
            models.Index(fields=['commentary_type']),
        ]
    
    def __str__(self):
        return f"{self.get_commentary_type_display()} for Game {self.game.game_id} - Round {self.round_number}"


class GameSummary(models.Model):
    """AI-generated summaries of completed games"""
    game = models.OneToOneField('Game', on_delete=models.CASCADE, related_name='summary')
    ai_summary = models.TextField(help_text="Full narrative summary of the game")
    
    # Game statistics
    total_rounds = models.IntegerField()
    total_spins = models.IntegerField()
    elimination_order = models.JSONField(default=list, help_text="List of players in elimination order")
    key_moments = models.JSONField(default=list, help_text="Significant events during the game")
    statistics = models.JSONField(default=dict, help_text="Detailed game statistics")
    
    # Ratings
    excitement_rating = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="AI-generated excitement rating"
    )
    
    generated_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-generated_at']
        verbose_name_plural = 'Game summaries'
    
    def __str__(self):
        return f"Summary for Game {self.game.game_id}"