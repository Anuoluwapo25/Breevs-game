from rest_framework import serializers
from .models import Game, Player, GameSummary, GameCommentary, GameEvent  # Ensure GameEvent is defined

class GameEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameEvent
        fields = ['id', 'game', 'event_type', 'player_address', 'event_data', 'block_height']

class GameListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = ['game_id', 'created_at', 'current_round', 'prize_pool', 'stake_amount', 'is_completed']

class GameDetailSerializer(serializers.ModelSerializer):
    players = serializers.StringRelatedField(many=True)  # Or custom serializer if needed
    winner_address = serializers.CharField(read_only=True)

    class Meta:
        model = Game
        fields = ['game_id', 'created_at', 'current_round', 'prize_pool', 'stake_amount', 
                  'is_completed', 'winner_address', 'players']

class GameCommentarySerializer(serializers.ModelSerializer):
    class Meta:
        model = GameCommentary
        fields = ['id', 'game', 'round_number', 'commentary_text', 'commentary_type', 
                  'tension_level', 'context_data', 'created_at']

class GameSummarySerializer(serializers.ModelSerializer):
    winner_address = serializers.CharField(source='game.winner_address', read_only=True)
    
    class Meta:
        model = GameSummary
        fields = [
            'id', 'game', 'ai_summary', 'total_rounds', 'total_spins',
            'elimination_order', 'key_moments', 'statistics',
            'winner_address', 'generated_at'
        ]