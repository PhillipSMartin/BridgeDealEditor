import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BridgeTable } from './BridgeTable';
import { BridgeBoard, Direction, Suit } from '@/types/bridge';
import { LinParser } from '@/utils/linParser';
import { toast } from 'sonner';

export const BridgeEditor: React.FC = () => {
  const [board, setBoard] = useState<BridgeBoard | null>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [bboUrl, setBboUrl] = useState('');
  const [playCards, setPlayCards] = useState<Map<string, number>>(new Map());
  const [playOrderCounter, setPlayOrderCounter] = useState(1);
  const [draggedCard, setDraggedCard] = useState<{
    suit: Suit;
    rank: string;
    fromDirection: Direction;
  } | null>(null);

  const initializeBoardData = useCallback((boardData: BridgeBoard) => {
    setBoard(boardData);
    
    // Initialize play cards from existing play sequence
    const newPlayCards = new Map<string, number>();
    boardData.Play.forEach((card: string, index: number) => {
      newPlayCards.set(card, index + 1);
    });
    setPlayCards(newPlayCards);
    setPlayOrderCounter(boardData.Play.length + 1);
    
    setSelectedCards(new Set());
  }, []);

  const loadJsonFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        initializeBoardData(jsonData);
        toast('JSON file loaded successfully!');
      } catch (error) {
        toast('Error parsing JSON file. Please check the format.');
        console.error('JSON parse error:', error);
      }
    };
    reader.readAsText(file);
  }, [initializeBoardData]);

  const importBboUrl = useCallback(() => {
    if (!bboUrl.trim()) {
      toast('Please enter a BBO URL.');
      return;
    }
    try {
      const boardData = LinParser.parseLinFromUrl(bboUrl.trim());
      if (boardData) {
        initializeBoardData(boardData);
        toast('BBO URL imported successfully!');
      } else {
        toast('Could not parse the BBO URL. Please check the format.');
      }
    } catch (error) {
      toast('Error parsing BBO URL.');
      console.error('BBO URL parse error:', error);
    }
  }, [bboUrl, initializeBoardData]);


  const getCardKey = (suit: Suit, rank: string) => `${suit[0]}${rank}`;

  const handleCardClick = useCallback((direction: Direction, suit: Suit, rank: string) => {
    const cardKey = getCardKey(suit, rank);
    
    // Check if this card is already in the play sequence
    if (playCards.has(cardKey)) {
      // Remove from play sequence
      const newPlayCards = new Map(playCards);
      const removedOrder = newPlayCards.get(cardKey)!;
      newPlayCards.delete(cardKey);
      
      // Adjust order numbers for cards played after the removed card
      for (const [key, order] of newPlayCards.entries()) {
        if (order > removedOrder) {
          newPlayCards.set(key, order - 1);
        }
      }
      
      setPlayCards(newPlayCards);
      setPlayOrderCounter(playOrderCounter - 1);
      toast(`Card ${cardKey} removed from play sequence`);
      return;
    }

    // Check if card is selected (for double-click confirmation)
    if (selectedCards.has(cardKey)) {
      // Confirmed selection - add to play sequence
      const newPlayCards = new Map(playCards);
      newPlayCards.set(cardKey, playOrderCounter);
      setPlayCards(newPlayCards);
      setPlayOrderCounter(playOrderCounter + 1);
      
      const newSelectedCards = new Set(selectedCards);
      newSelectedCards.delete(cardKey);
      setSelectedCards(newSelectedCards);
      
      toast(`Card ${cardKey} added to play sequence (order ${playOrderCounter})`);
    } else {
      // First click - select card
      const newSelectedCards = new Set(selectedCards);
      newSelectedCards.add(cardKey);
      setSelectedCards(newSelectedCards);
      toast(`Card ${cardKey} selected. Click again to confirm adding to play sequence.`);
    }
  }, [selectedCards, playCards, playOrderCounter]);

  const handleCardDragStart = useCallback((
    e: React.DragEvent,
    direction: Direction,
    suit: Suit,
    rank: string
  ) => {
    setDraggedCard({ suit, rank, fromDirection: direction });
    e.dataTransfer.setData('text/plain', JSON.stringify({ suit, rank, fromDirection: direction }));
  }, []);

  const handleCardDrop = useCallback((e: React.DragEvent, targetDirection: Direction) => {
    if (!draggedCard || !board) return;

    const { suit, rank, fromDirection } = draggedCard;
    
    if (fromDirection === targetDirection) {
      setDraggedCard(null);
      return; // Same position, no change needed
    }

    // Create new board state with card moved
    const newBoard = { ...board };
    newBoard.Seats = board.Seats.map(seat => {
      if (seat.Direction === fromDirection) {
        // Remove card from source hand
        const currentCards = seat.Hand[suit].split('');
        const cardIndex = currentCards.indexOf(rank);
        if (cardIndex > -1) {
          currentCards.splice(cardIndex, 1);
        }
        return {
          ...seat,
          Hand: {
            ...seat.Hand,
            [suit]: currentCards.join('')
          }
        };
      } else if (seat.Direction === targetDirection) {
        // Add card to target hand and sort by rank order
        const rankOrder = 'AKQJT98765432';
        const newCards = (seat.Hand[suit] + rank).split('');
        newCards.sort((a, b) => rankOrder.indexOf(a) - rankOrder.indexOf(b));
        return {
          ...seat,
          Hand: {
            ...seat.Hand,
            [suit]: newCards.join('')
          }
        };
      }
      return seat;
    });

    setBoard(newBoard);
    setDraggedCard(null);
    toast(`Moved ${rank}${suit[0]} from ${fromDirection} to ${targetDirection}`);
  }, [draggedCard, board]);

  const exportJson = useCallback(() => {
    if (!board) return;

    // Create export data with updated play sequence
    const playSequence = Array.from(playCards.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([card]) => card);

    const exportData = {
      ...board,
      Play: playSequence
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `board${board['Board number']}_modified.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast('JSON file exported successfully!');
  }, [board, playCards]);


  const clearPlaySequence = useCallback(() => {
    setPlayCards(new Map());
    setPlayOrderCounter(1);
    setSelectedCards(new Set());
    toast('Play sequence cleared');
  }, []);

  return (
    <div className="w-full min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Bridge Board Editor</h1>
        
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-wrap gap-4 justify-center">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Load JSON File</label>
              <Input
                type="file"
                accept=".json"
                onChange={loadJsonFile}
                className="w-64"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Import BBO URL</label>
              <div className="flex gap-2">
                <Button onClick={importBboUrl} variant="outline">
                  Enter URL
                </Button>
                <Input
                  type="text"
                  placeholder="Paste BBO URL here..."
                  value={bboUrl}
                  onChange={(e) => setBboUrl(e.target.value)}
                  className="w-80"
                />
              </div>
            </div>
          </div>
          
          {board && (
            <div className="flex flex-wrap gap-4 justify-center">
              <Button onClick={exportJson} variant="default">
                Export JSON
              </Button>
              <Button onClick={clearPlaySequence} variant="outline">
                Clear Play Sequence
              </Button>
            </div>
          )}
        </div>

        {board && (
          <>
            <div className="mb-6 p-4 bg-card rounded-lg border">
              <h3 className="font-semibold mb-2">Instructions:</h3>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• <strong>Move cards:</strong> Drag cards between hands to change their location</li>
                <li>• <strong>Set play order:</strong> Click cards twice to add them to the play sequence</li>
                <li>• <strong>Remove from play:</strong> Click cards with play numbers to remove them</li>
                <li>• <strong>Export:</strong> Save your changes to a new JSON file</li>
              </ul>
              <div className="mt-2 text-sm">
                <strong>Current play sequence length:</strong> {playCards.size} cards
              </div>
            </div>

            <BridgeTable
              board={board}
              selectedCards={selectedCards}
              playCards={playCards}
              onCardClick={handleCardClick}
              onCardDragStart={handleCardDragStart}
              onCardDrop={handleCardDrop}
            />
          </>
        )}

        {!board && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Load a JSON file or enter a BBO URL to start editing the bridge board.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>JSON format:</strong> Bridge board with seats, hands, and play sequence</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};