const socket = io();
const chess = new Chess();
const boardElement = document.getElementById("chessboard");
const statusIndicator = document.getElementById("statusIndicator");
const statusText = document.getElementById("statusText");
const gameStatus = document.getElementById("gameStatus");
const currentTurn = document.getElementById("currentTurn");
const moveCount = document.getElementById("moveCount");
const moveHistory = document.getElementById("moveHistory");
const newGameBtn = document.getElementById("newGameBtn");
const playAIBtn = document.getElementById("playAIBtn");
const whitePlayer = document.getElementById("whitePlayer");
const blackPlayer = document.getElementById("blackPlayer");
const nameModal = document.getElementById("nameModal");
const playerNameInput = document.getElementById("playerNameInput");
const startGameBtn = document.getElementById("startGameBtn");
const playerNameDisplay = document.getElementById("playerName");
const opponentNameDisplay = document.getElementById("opponentName");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let lastMoveTime = 0;
let matchFound = false;
let selectedSquare = null;
let possibleMoves = [];
let lastMove = null;
let moves = [];
let isAIMode = false;
let isAIThinking = false;
let currentPlayerName = 'Player';
let opponentName = 'Waiting...';
const MOVE_COOLDOWN = 100;

const updateStatus = (status, found = false) => {
    matchFound = found;
    statusText.textContent = found ? 'Match Found!' : status;
    gameStatus.textContent = status;
    
    statusIndicator.className = 'w-3 h-3 rounded-full animate-pulse ';
    if (found) {
        statusIndicator.classList.add('bg-green-500');
    } else {
        switch (status.toLowerCase()) {
            case 'connecting':
            case 'connecting...':
                statusIndicator.classList.add('bg-yellow-500');
                break;
            case 'waiting':
            case 'waiting for opponent...':
                statusIndicator.classList.add('bg-blue-500');
                break;
            case 'connected':
            case 'game started!':
            case 'game in progress':
                statusIndicator.classList.add('bg-green-500');
                break;
            default:
                statusIndicator.classList.add('bg-gray-500');
        }
    }
};

const updatePlayerIndicators = () => {
    if (isAIMode) {
        whitePlayer.className = 'px-4 py-2 rounded-full font-medium transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg';
        whitePlayer.textContent = `♔ ${currentPlayerName} (White)`;
        blackPlayer.className = 'px-4 py-2 rounded-full font-medium transition-all duration-300 bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg';
        blackPlayer.textContent = '♚ AlgoBot 🤖 (Black)';
    } else if (playerRole === 'w') {
        whitePlayer.className = 'px-4 py-2 rounded-full font-medium transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg';
        whitePlayer.textContent = `♔ ${currentPlayerName} (White)`;
        blackPlayer.className = 'px-4 py-2 rounded-full font-medium transition-all duration-300 bg-white/20 text-gray-300';
        blackPlayer.textContent = `♚ ${opponentName}`;
    } else if (playerRole === 'b') {
        blackPlayer.className = 'px-4 py-2 rounded-full font-medium transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg';
        blackPlayer.textContent = `♚ ${currentPlayerName} (Black)`;
        whitePlayer.className = 'px-4 py-2 rounded-full font-medium transition-all duration-300 bg-white/20 text-gray-300';
        whitePlayer.textContent = `♔ ${opponentName}`;
    }
};

const squareToCoords = (square) => {
    const col = square.charCodeAt(0) - 97;
    const row = 8 - parseInt(square[1]);
    return {row, col};
};

const coordsToSquare = (row, col) => {
    return String.fromCharCode(97 + col) + (8 - row);
};

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    boardElement.className = `relative grid grid-cols-8 gap-0 w-[480px] h-[480px] lg:w-[560px] lg:h-[560px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 ${
        playerRole === 'b' ? 'rotate-180' : ''
    }`;
    
    board.forEach((row, rowIndex) => {
        row.forEach((square, squareIndex) => {
            const squareElement = document.createElement("div");
            const squareName = coordsToSquare(rowIndex, squareIndex);
            const isLight = (rowIndex + squareIndex) % 2 === 0;
            const isSelected = selectedSquare === squareName;
            const isPossibleMove = possibleMoves.includes(squareName);
            const isLastMoveSquare = lastMove && (squareName === lastMove.from || squareName === lastMove.to);
            
            squareElement.className = `relative flex items-center justify-center text-5xl lg:text-6xl cursor-pointer transition-all duration-300 ${
                isLight ? 'bg-amber-100 hover:bg-amber-200' : 'bg-amber-800 hover:bg-amber-700'
            } ${isSelected ? 'ring-4 ring-yellow-400 ring-inset' : ''} ${
                isLastMoveSquare ? 'bg-yellow-300/50' : ''
            }`;
            
            squareElement.dataset.row = rowIndex;
            squareElement.dataset.col = squareIndex;
            squareElement.dataset.square = squareName;

            // Possible move indicator
            if (isPossibleMove) {
                const moveIndicator = document.createElement("div");
                moveIndicator.className = "absolute inset-0 flex items-center justify-center";
                moveIndicator.innerHTML = '<div class="w-6 h-6 bg-green-500/60 rounded-full animate-pulse"></div>';
                squareElement.appendChild(moveIndicator);
            }

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.className = `select-none transition-all duration-300 hover:scale-110 transform z-10 ${
                    playerRole === square.color ? 'cursor-pointer hover:drop-shadow-2xl' : 'cursor-not-allowed'
                } ${playerRole === 'b' ? 'rotate-180' : ''}`;
                
                // Force piece colors with inline styles
                if (square.color === 'w') {
                    // White pieces - force white color
                    pieceElement.style.cssText = 'color: #ffffff !important; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); filter: drop-shadow(0 3px 3px rgba(0,0,0,0.8));';
                } else {
                    // Black pieces - force black color  
                    pieceElement.style.cssText = 'color: #000000 !important; text-shadow: 1px 1px 2px rgba(255,255,255,0.6); filter: drop-shadow(0 2px 2px rgba(255,255,255,0.4));';
                }
                
                pieceElement.innerText = getPieceUnicode(square);
                squareElement.appendChild(pieceElement);
            }

            // Square coordinates
            if (rowIndex === 7) {
                const coordElement = document.createElement("div");
                coordElement.className = "absolute bottom-1 right-1 text-xs font-bold opacity-60 text-gray-700";
                coordElement.textContent = String.fromCharCode(97 + squareIndex);
                squareElement.appendChild(coordElement);
            }
            if (squareIndex === 0) {
                const coordElement = document.createElement("div");
                coordElement.className = "absolute top-1 left-1 text-xs font-bold opacity-60 text-gray-700";
                coordElement.textContent = 8 - rowIndex;
                squareElement.appendChild(coordElement);
            }

            squareElement.addEventListener("click", () => handleSquareClick(rowIndex, squareIndex));
            boardElement.appendChild(squareElement);
        });
    });

    // Update turn indicator
    currentTurn.textContent = chess.turn() === 'w' ? 'White' : 'Black';
    moveCount.textContent = moves.length;
};

const handleSquareClick = (row, col) => {
    if (isAIMode && chess.turn() !== playerRole) return; // Prevent moves during AI turn
    if (isAIThinking) return;
    
    const square = coordsToSquare(row, col);
    const piece = chess.get(square);

    if (selectedSquare) {
        if (selectedSquare === square) {
            selectedSquare = null;
            possibleMoves = [];
        } else {
            const move = {
                from: selectedSquare,
                to: square,
                promotion: 'q'
            };
            
            if (isAIMode) {
                // Local move for AI mode
                try {
                    const madeMove = chess.move(move);
                    if (madeMove) {
                        moves.push(madeMove);
                        lastMove = {from: madeMove.from, to: madeMove.to};
                        updateMoveHistory(madeMove);
                        checkForGameOver();
                        
                        // AI makes a move after player
                        if (!chess.game_over()) {
                            setTimeout(makeAIMove, 500);
                        }
                    }
                } catch (error) {
                    console.log('Invalid move');
                }
            } else {
                handleMove(move);
            }
            
            selectedSquare = null;
            possibleMoves = [];
        }
    } else if (piece && piece.color === playerRole) {
        selectedSquare = square;
        const chessMoves = chess.moves({square, verbose: true});
        possibleMoves = chessMoves.map(m => m.to);
    }
    
    renderBoard();
};

const handleMove = (move) => {
    const now = Date.now();
    if (now - lastMoveTime < MOVE_COOLDOWN) return;
    
    lastMoveTime = now;
    socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        // Black pieces (lowercase)
        p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚",
        // White pieces (uppercase) 
        P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔",
    };
    return unicodePieces[piece.type] || "";
};

const updateMoveHistory = (move) => {
    const moveElement = document.createElement("div");
    moveElement.className = "flex items-center gap-3 text-sm";
    moveElement.innerHTML = `
        <span class="text-gray-400 w-8">${Math.floor(moves.length / 2) + 1}.</span>
        <span class="text-white font-mono bg-black/20 px-2 py-1 rounded">${move.from}${move.to}</span>
    `;
    moveHistory.appendChild(moveElement);
    moveHistory.scrollTop = moveHistory.scrollHeight;
};

const checkForGameOver = () => {
    if (chess.in_checkmate()) {
        const winner = chess.turn() === 'w' ? 'Black' : 'White';
        if (isAIMode) {
            const result = winner === 'White' ? 'You win!' : 'Computer wins!';
            updateStatus(result);
        } else {
            updateStatus(`${winner} wins!`);
        }
    } else if (chess.in_draw()) {
        updateStatus('Game drawn');
    }
};

newGameBtn.addEventListener('click', () => {
    location.reload();
});

playAIBtn.addEventListener('click', () => {
    startAIGame();
});

const startAIGame = () => {
    isAIMode = true;
    playerRole = 'w'; // Player is always white vs AI
    opponentName = 'AlgoBot 🤖';
    opponentNameDisplay.textContent = opponentName;
    chess.reset();
    moves = [];
    lastMove = null;
    selectedSquare = null;
    possibleMoves = [];
    updateStatus('Playing vs Computer', true);
    updatePlayerIndicators();
    renderBoard();
    moveHistory.innerHTML = '';
};

const makeAIMove = () => {
    if (isAIThinking || chess.game_over()) return;
    
    isAIThinking = true;
    updateStatus('AI is thinking...');
    
    setTimeout(() => {
        const possibleMoves = chess.moves({ verbose: true });
        if (possibleMoves.length === 0) {
            isAIThinking = false;
            return;
        }
        
        // Simple AI: Random move with slight preference for captures
        let bestMoves = possibleMoves.filter(move => move.captured);
        if (bestMoves.length === 0) {
            bestMoves = possibleMoves;
        }
        
        const randomMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];
        
        chess.move(randomMove);
        moves.push(randomMove);
        lastMove = {from: randomMove.from, to: randomMove.to};
        
        renderBoard();
        updateMoveHistory(randomMove);
        checkForGameOver();
        
        isAIThinking = false;
        updateStatus('Your turn', true);
    }, 1000 + Math.random() * 1500); // AI thinks for 1-2.5 seconds
};

socket.on("playerRole", function(role) {
    playerRole = role;
    isAIMode = false;
    
    // Send player name to server
    socket.emit('playerName', currentPlayerName);
    
    if (playerRole === 'w') {
        updateStatus('Waiting for opponent...');
        opponentName = 'Waiting...';
    } else if (playerRole === 'b') {
        updateStatus('Game Started!', true);
        opponentName = 'Player 2';
    }
    opponentNameDisplay.textContent = opponentName;
    updatePlayerIndicators();
    renderBoard();
});

// Listen for opponent name
socket.on('opponentName', function(name) {
    opponentName = name || 'Opponent';
    opponentNameDisplay.textContent = opponentName;
    updatePlayerIndicators();
});

socket.on("gameStarted", function() {
    updateStatus('Game in progress', true);
});

socket.on("spectatorRole", function() {
    playerRole = null;
    renderBoard();
    updateStatus('Spectating');
});

socket.on("boardState", function(fen) {
    if (!fen || typeof fen !== 'string') return;
    try {
        chess.load(fen);
        renderBoard();
    } catch (error) {
        console.error('Invalid board state received');
    }
});

socket.on("move", function(move) {
    if (!move || typeof move !== 'object' || !move.from || !move.to) return;
    try {
        chess.move(move);
        moves.push(move);
        lastMove = {from: move.from, to: move.to};
        renderBoard();
        updateMoveHistory(move);
        checkForGameOver();
    } catch (error) {
        console.error('Invalid move received');
    }
});

socket.on("gameStarted", function() {
    updateStatus('Game in progress', true);
});

// Show name modal on page load
startGameBtn.addEventListener('click', () => {
    currentPlayerName = playerNameInput.value.trim() || 'Player';
    playerNameDisplay.textContent = currentPlayerName;
    nameModal.style.display = 'none';
    updateStatus('Connecting...');
});

// Allow Enter key to start game
playerNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        startGameBtn.click();
    }
});

updateStatus('Enter your name to start');
renderBoard();