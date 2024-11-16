class Board {
    constructor() {
        this.board = this.#generateBoard();
        this.#setupBoard();
        this.history = [];
        this.prevEPTarget = null;
        this.enPassantTarget = null;
        this.checkmate = false;
    }

    #generateBoard() {
        let board = Array(120).fill("");
        for (let i = 0; i < board.length; i++) {
            if (i < 21 || i % 10 === 0 || i % 10 === 9 || i > 100) {
                board[i] = "*";
            } else {
                board[i] = ".";
            }
        }
        return board;
    }

    #setupBoard() {
        let blacks = ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"];
        let whites = ["♖", "♘", "♗", "♔", "♕", "♗", "♘", "♖"];
        for (let i = 21; i < 29; i++) {
            this.board[i + 10] = "♟";
            this.board[i] = blacks[i % 7];
            this.board[this.board.length - 1 - i - 10] = "♙";
            this.board[this.board.length - 1 - i] = whites[i % 7];
        }
    }

    getIndex(row, col) {
        return (row + 2) * 10 + (col + 1);
    }
    getRowCol(idx) {
        return [Math.floor(idx / 10) - 2, (idx % 10) - 1];
    }

    printBoard() {
        let str = "";
        let nums = "12345678";
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] == "*") {
                continue;
            }
            if (i % 10 == 1) {
                str += nums[Math.floor(nums.length - (i / 10 - 2))] + " | ";
            }
            str += `${this.board[i]} `;
            if (i % 10 == 8) {
                str += "|\n";
            }
        }
        console.log("  +-----------------+");
        console.log(str.substring(0, str.length - 1));
        console.log("  +-----------------+");
        console.log("    a b c d e f g h");
    }

    fen() {
        const pieces = {
            "♜": "r",
            "♞": "n",
            "♝": "b",
            "♛": "q",
            "♚": "k",
            "♟": "p",
            "♖": "R",
            "♘": "N",
            "♗": "B",
            "♔": "K",
            "♕": "Q",
            "♙": "P",
        };
        let fen = "";
        let empties = 0;
        for (let i = 21; i < this.board.length - 21; i++) {
            if (i % 10 == 9) {
                fen += "/";
                empties = 0;
            }
            if (this.board[i] == "*") {
                continue;
            }
            if (this.board[i] == ".") {
                empties += 1;
            } else {
                empties = 0;
                fen += pieces[this.board[i]];
            }
            if (empties != 0 && (i % 10 == 8 || this.board[i + 1] != ".")) {
                fen += `${empties}`;
            }
        }
        return fen;
    }

    loadFen(fen) {
        const pieces = {
            r: "♜",
            n: "♞",
            b: "♝",
            q: "♛",
            k: "♚",
            p: "♟",
            R: "♖",
            N: "♘",
            B: "♗",
            K: "♔",
            Q: "♕",
            P: "♙",
        };
        let row = 0;
        let col = 0;
        for (let i = 0; i < fen.length; i++) {
            if (fen[i] == "/") {
                row += 1;
                col = 0;
                continue;
            }
            if (isNaN(parseInt(fen[i]))) {
                this.board[this.getIndex(row, col)] = pieces[fen[i]];
                col += 1;
            } else {
                for (let j = 0; j < parseInt(fen[i]); j++) {
                    this.board[this.getIndex(row, col)] = ".";
                    col += 1;
                }
            }
        }
    }

    isEmpty(row, col) {
        let idx = this.getIndex(row, col);
        return this.board[idx] == ".";
    }

    getPiece(row, col) {
        if (this.isEmpty(row, col)) {
            throw Error("Cell is empty, no piece here");
        }

        let symbol = this.board[this.getIndex(row, col)];
        let color = "♔♕♖♗♘♙".includes(symbol) ? "white" : "black";
        switch (symbol) {
            case "♙":
            case "♟":
                return new Pawn(color, this);
            case "♖":
            case "♜":
                return new Rook(color, this);
            case "♘":
            case "♞":
                return new Knight(color, this);
            case "♗":
            case "♝":
                return new Bishop(color, this);
            case "♕":
            case "♛":
                return new Queen(color, this);
            case "♔":
            case "♚":
                return new King(color, this);
            default:
                return null;
        }
    }

    betweenBounds(row, col) {
        let idx = this.getIndex(row, col);
        let insideBoard = row >= 0 && row <= 7 && col >= 0 && col <= 7;
        return this.board[idx] != "*" && insideBoard;
    }

    getPossibleMoves(color) {
        if (this.isCheckmate("black") || this.isCheckmate("white")) {
            return [];
        }
        const moves = [];
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (!this.isEmpty(i, j)) {
                    let piece = this.getPiece(i, j);
                    if (piece.color == color) {
                        const pieceMoves = piece.legalMoves(i, j);
                        if (pieceMoves.length == 0) {
                            continue;
                        }
                        moves.push([[i, j], [...pieceMoves]]);
                    }
                }
            }
        }
        return moves;
    }

    makeMove(start, end) {
        if (end == undefined) {
            console.log(start);
            this.printBoard();
        }
        let from = this.getIndex(...start);
        let to = this.getIndex(...end);
        let movedPiece = this.board[from];
        let endPiece = this.board[to];
        let isEP = false;
        let isCapture = false;
        let isCheck = false;
        let prevCheckmate = this.checkmate;

        let piece = this.getPiece(...start);
        let legal = piece
            .legalMoves(...start)
            .some(([r, c]) => r == end[0] && c == end[1]);

        if (this.board[to] != ".") {
            isCapture = true;
        }

        if (legal) {
            this.board[to] = this.board[from];
            this.board[from] = ".";

            // 1. b4 b6 2. b5 c5 now white can capture en passant on c6 for ply 5
            if (piece instanceof Pawn && Math.abs(start[0] - end[0]) == 2) {
                this.prevEPTarget = this.enPassantTarget;
                this.enPassantTarget = [end[0] - piece.dir, end[1]];
                // console.log(this.enPassantTarget)
            } else if (
                piece instanceof Pawn &&
                end[0] == this.enPassantTarget?.[0] &&
                end[1] == this.enPassantTarget?.[1]
            ) {
                // If this move is an en passant capture
                let captureRow = start[0];
                let captureCol = end[1];
                let captureIdx = this.getIndex(captureRow, captureCol);
                // endPiece = this.board[captureIdx];
                this.board[captureIdx] = ".";
                isEP = true;
            } else {
                this.prevEPTarget = this.enPassantTarget;
                this.enPassantTarget = null;
            }
        } else {
            console.log(this.history);
            console.log(this.enPassantTarget);
            console.log(this.checkmate);
            console.log(this.prevEPTarget);
            console.log(piece.legalMoves(...start));
            this.printBoard();
            throw Error(
                `Invalid move: piece ${this.board[from]} at ${start} can't move to ${end}`,
            );
        }

        if (this.isCheck(piece.color == WHITE ? BLACK : WHITE)) {
            isCheck = true;
        }
        if (this.isCheckmate(piece.color == WHITE ? BLACK : WHITE)) {
            this.checkmate = true;
        }

        this.history.push([
            start,
            end,
            movedPiece,
            endPiece,
            isEP,
            this.prevEPTarget,
            prevCheckmate,
        ]);
        return [isEP, isCapture, isCheck];
    }

    undoMove() {
        let [
            start,
            end,
            movedPiece,
            endPiece,
            isEP,
            prevEPTarget,
            prevCheckmate,
        ] = this.history.pop();
        let from = this.getIndex(...start);
        let to = this.getIndex(...end);

        this.board[from] = movedPiece;
        this.board[to] = endPiece;

        if (isEP) {
            let captureRow = start[0];
            let captureCol = end[1];
            this.board[this.getIndex(captureRow, captureCol)] =
                movedPiece == "♙" ? "♟" : "♙";
        }
        this.enPassantTarget = prevEPTarget;
        this.checkmate = prevCheckmate;

        return "thumbs up :)";
    }

    getKingPos(color) {
        const king = color == "white" ? "♔" : "♚";
        const findKing = (piece) => piece == king;
        const kingIdx = this.board.findIndex(findKing);
        return this.getRowCol(kingIdx);
    }

    isCheck(color) {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (!this.isEmpty(row, col)) {
                    let piece = this.getPiece(row, col);
                    if (piece.color != color) {
                        if (piece.isChecking(row, col)) {
                            return true;
                        }
                    }
                }
            }
        }

        return false;
    }

    isSafeMove(start, end, color) {
        let from = this.getIndex(...start);
        let to = this.getIndex(...end);

        let piece = this.getPiece(...start);

        let movedPiece = this.board[from];
        let endPiece = this.board[to];

        this.board[to] = this.board[from];
        this.board[from] = ".";

        let isSafe = !this.isCheck(color);

        this.board[from] = movedPiece;
        this.board[to] = endPiece;

        return isSafe;
    }

    isCheckmate(color) {
        const kingPos = this.getKingPos(color);
        const king = this.getPiece(...kingPos);

        if (!this.isCheck(color)) {
            return false;
        }

        for (const [dx, dy] of king.KING_MOVES) {
            let newr = kingPos[0] + dx;
            let newc = kingPos[1] + dy;
            if (this.betweenBounds(newr, newc)) {
                if (this.isEmpty(newr, newc)) {
                    if (this.isSafeMove(kingPos, [newr, newc], color)) {
                        return false;
                    }
                }
            }
        }

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                if (!this.isEmpty(i, j)) {
                    let piece = this.getPiece(i, j);
                    if (piece.color == color) {
                        const pieceMoves = piece.legalMoves(i, j);
                        if (pieceMoves.length == 0) {
                            continue;
                        }
                        for (let move of pieceMoves) {
                            if (this.isSafeMove([i, j], move, color)) {
                                return false;
                            }
                        }
                    }
                }
            }
        }

        // this.checkmate = color;
        return true;
    }

    toStandard(from, to) {
        const pieces = {
            "♜": "r",
            "♞": "n",
            "♝": "b",
            "♛": "q",
            "♚": "k",
            "♟": "",
            "♖": "R",
            "♘": "N",
            "♗": "B",
            "♔": "K",
            "♕": "Q",
            "♙": "",
        };
        let captured = this.board[this.getIndex(...to)];
        let p = pieces[this.board[this.getIndex(...from)]];
        let c = "";
        if (captured != ".") {
            if (p == "") {
                c = String.fromCharCode(97 + from[1]) + "x";
            } else {
                c = "x";
            }
        }
        if (p == undefined) {
            debugger;
        }
        return `${p.toUpperCase()}${c}${String.fromCharCode(97 + to[1])}${8 - to[0]}`;
    }

    getNumberOfMoves(color) {
        const moves = this.getPossibleMoves(color);
        let count = 0;
        for (const [piece, mvs] of moves) {
            count += mvs.length;
        }
        return count;
    }
}

class Piece {
    CARDINALS = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ];
    DIAGONALS = [
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
    ];
    L_SHAPED = [
        [2, 1],
        [2, -1],
        [-2, 1],
        [-2, -1],
        [1, 2],
        [1, -2],
        [-1, 2],
        [-1, -2],
    ];
    KING_MOVES = [
        [1, 0],
        [-1, 0], // One square vertically
        [0, 1],
        [0, -1], // One square horizontally
        [1, 1],
        [1, -1], // One square diagonally
        [-1, 1],
        [-1, -1], // One square diagonally (opposite)
    ];

    constructor(color, board) {
        this.color = color;
        this.board = board;
        // this.deltas = [];
    }

    legalMoves(row, col) {
        return new Error("Base class can't use legalMoves");
    }

    adNauseum(row, col) {
        if (this.board.checkmate) {
            return [];
        }
        let moves = [];
        for (let [xd, yd] of this.deltas) {
            let nrow = row + xd;
            let ncol = col + yd;
            while (this.board.betweenBounds(nrow, ncol)) {
                if (this.board.isEmpty(nrow, ncol)) {
                    if (
                        this.board.isCheck(this.color) &
                        !this.board.isSafeMove(
                            [row, col],
                            [nrow, ncol],
                            this.color,
                        )
                    ) {
                        break;
                    }
                    moves.push([nrow, ncol]);
                } else {
                    let piece = this.board.getPiece(nrow, ncol);
                    if (
                        this.board.isCheck(this.color) &&
                        !this.board.isSafeMove(
                            [row, col],
                            [nrow, ncol],
                            this.color,
                        )
                    ) {
                        break;
                    }
                    if (piece && piece.color != this.color) {
                        moves.push([nrow, ncol]);
                    }
                    break;
                }
                nrow += xd;
                ncol += yd;
            }
        }
        return moves;
    }

    isChecking(row, col) {
        for (const [xd, yd] of this.deltas) {
            let nrow = row + xd;
            let ncol = col + yd;
            while (this.board.betweenBounds(nrow, ncol)) {
                if (!this.board.isEmpty(nrow, ncol)) {
                    let piece = this.board.getPiece(nrow, ncol);
                    if (piece.color != this.color && piece instanceof King) {
                        return true;
                    } else {
                        break;
                    }
                }
                nrow += xd;
                ncol += yd;
            }
        }
        return false;
    }
}

class Bishop extends Piece {
    constructor(color, board) {
        super(color, board);
        this.deltas = this.DIAGONALS;
    }

    legalMoves(row, col) {
        return this.adNauseum(row, col);
    }
}

class Rook extends Piece {
    constructor(color, board) {
        super(color, board);
        this.deltas = this.CARDINALS;
    }

    legalMoves(row, col) {
        return this.adNauseum(row, col);
    }
}

class Queen extends Piece {
    constructor(color, board) {
        super(color, board);
        this.deltas = this.DIAGONALS.concat(this.CARDINALS);
    }

    legalMoves(row, col) {
        return this.adNauseum(row, col);
    }
}

class Knight extends Piece {
    constructor(color, board) {
        super(color, board);
        this.deltas = this.L_SHAPED;
    }

    legalMoves(row, col) {
        if (this.board.checkmate) {
            return [];
        }
        let moves = [];
        for (let [xd, yd] of this.deltas) {
            let nrow = row + xd;
            let ncol = col + yd;
            if (this.board.betweenBounds(nrow, ncol)) {
                if (this.board.isEmpty(nrow, ncol)) {
                    if (
                        this.board.isCheck(this.color) &&
                        !this.board.isSafeMove(
                            [row, col],
                            [nrow, ncol],
                            this.color,
                        )
                    ) {
                        continue;
                    }
                    moves.push([nrow, ncol]);
                } else {
                    let piece = this.board.getPiece(nrow, ncol);
                    if (piece.color != this.color) {
                        if (
                            this.board.isCheck(this.color) &&
                            !this.board.isSafeMove(
                                [row, col],
                                [nrow, ncol],
                                this.color,
                            )
                        ) {
                            continue;
                        }
                        moves.push([nrow, ncol]);
                    }
                }
            }
        }
        return moves;
    }

    isChecking(row, col) {
        for (let [xd, yd] of this.deltas) {
            let nrow = row + xd;
            let ncol = col + yd;

            if (this.board.betweenBounds(nrow, ncol)) {
                if (!this.board.isEmpty(nrow, ncol)) {
                    let piece = this.board.getPiece(nrow, ncol);
                    if (piece.color != this.color && piece instanceof King) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

class King extends Piece {
    legalMoves(row, col) {
        if (this.board.checkmate) {
            return [];
        }
        let moves = [];
        for (let [xd, yd] of this.KING_MOVES) {
            let nrow = row + xd;
            let ncol = col + yd;
            if (this.board.betweenBounds(nrow, ncol)) {
                if (this.board.isEmpty(nrow, ncol)) {
                    if (
                        this.board.isCheck(this.color) &&
                        !this.board.isSafeMove(
                            [row, col],
                            [nrow, ncol],
                            this.color,
                        )
                    ) {
                        continue;
                    }
                    if (
                        this.board.isSafeMove(
                            [row, col],
                            [nrow, ncol],
                            this.color,
                        )
                    ) {
                        moves.push([nrow, ncol]);
                    }
                } else {
                    let piece = this.board.getPiece(nrow, ncol);
                    if (
                        this.board.isCheck(this.color) &&
                        !this.board.isSafeMove(
                            [row, col],
                            [nrow, ncol],
                            this.color,
                        )
                    ) {
                        continue;
                    }
                    if (piece && piece.color !== this.color) {
                        moves.push([nrow, ncol]);
                    }
                }
            }
        }
        return moves;
    }

    isChecking(row, col) {
        return false;
    }
}

class Pawn extends Piece {
    constructor(color, board) {
        super(color, board);
        this.dir = color == "white" ? -1 : 1;
        this.start = color == "white" ? 6 : 1;
        this.prevPos = [];
    }

    legalMoves(row, col) {
        if (this.board.checkmate) {
            return [];
        }
        let moves = [];
        if (this.board.isEmpty(row + this.dir, col)) {
            if (this.board.isSafeMove([row, col], [row + this.dir, col])) {
                moves.push([row + this.dir, col]);
            }

            if (
                row == this.start &&
                this.board.isEmpty(row + 2 * this.dir, col) &&
                this.board.isSafeMove([row, col], [row + 2 * this.dir, col])
            ) {
                moves.push([row + 2 * this.dir, col]);
            }
        }

        for (let [xd, yd] of [
            [this.dir, 1],
            [this.dir, -1],
        ]) {
            let nrow = row + xd;
            let ncol = col + yd;

            if (this.board.betweenBounds(nrow, ncol)) {
                if (!this.board.isEmpty(nrow, ncol)) {
                    let piece = this.board.getPiece(nrow, ncol);
                    if (piece && piece.color != this.color) {
                        moves.push([nrow, ncol]);
                    }
                } else if (
                    this.board.enPassantTarget &&
                    nrow == this.board.enPassantTarget[0] &&
                    ncol == this.board.enPassantTarget[1]
                ) {
                    // En passant capture: check if the target pawn is of the opposite color
                    let targetPawn = this.board.getPiece(row, ncol); // The pawn to the side
                    if (
                        targetPawn &&
                        targetPawn instanceof Pawn &&
                        targetPawn.color != this.color
                    ) {
                        // console.log("reaches en passant", row, col);
                        // this.board.printBoard();
                        moves.push([nrow, ncol]);
                    }
                }
            }
        }

        return moves;
    }

    isChecking(row, col) {
        for (let [xd, yd] of [
            [this.dir, 1],
            [this.dir, -1],
        ]) {
            let nrow = row + xd;
            let ncol = col + yd;
            if (this.board.betweenBounds(nrow, ncol)) {
                if (!this.board.isEmpty(nrow, ncol)) {
                    let piece = this.board.getPiece(nrow, ncol);
                    if (
                        piece &&
                        piece.color != this.color &&
                        piece instanceof King
                    ) {
                        return true;
                    }
                }
            }
        }
    }
}

const BLACK = "black";
const WHITE = "white";

const game = new Board();

let captures = 0;
let eps_count = 0;
let checks = 0;
let checkmates = 0;
let totalMoves = 0;
function getMovesTilPly(ply, board, color) {
    if (ply == 0) {
        totalMoves++;
        return 1;
    }

    let total = 0;

    let availableMoves = board.getPossibleMoves(color);
    for (let moves of availableMoves) {
        for (let move of moves[1]) {
            let info = board.makeMove(moves[0], move);
            if (info[0]) {
                eps_count++;
            }
            if (info[1]) {
                captures++;
            }
            if (board.isCheck(color == BLACK ? WHITE : BLACK)) {
                if (board.isCheckmate(color == BLACK ? WHITE : BLACK)) {
                    checkmates++;
                    debugger;
                } else {
                    checks++;
                }
            }
            total += getMovesTilPly(
                ply - 1,
                board,
                color == BLACK ? WHITE : BLACK,
            );
            board.undoMove();
            if (totalMoves % 10000 == 0) {
                console.log(totalMoves);
            }
        }
    }
    return total;
}

/*
 * 1 ply: 20
 * 2 ply: 400
 * 3 ply: 8902
 * 4 ply: 197,281
 * 5 ply: 4,865,609
 * 6 ply: 119,060,324
 */

import { Chess } from "chess.js";

function numMoves(color, ply, moveSequence = "", moveHash = {}) {
    if (ply === 0) {
        // When we reach ply 0, store the sequence in moveHash
        moveHash[moveSequence.substring(0, moveSequence.length - 1)] = true;
        return;
    }

    // Get the available moves for the current color
    let availableMoves = game.getPossibleMoves(color);
    for (let moves of availableMoves) {
        for (let move of moves[1]) {
            let moveNotation = game.toStandard(moves[0], move);
            game.makeMove(moves[0], move);
            numMoves(
                color === BLACK ? WHITE : BLACK,
                ply - 1,
                `${moveSequence} ${moveNotation},`,
                moveHash,
            );
            game.undoMove();
        }
    }

    return moveHash;
}

// console.log(numMoves(WHITE, 1));
// console.log(getMovesTilPly(1, game, WHITE), captures, eps_count, checks);
// eps_count = 0;
// captures = 0;
// checks = 0;
// console.log(getMovesTilPly(2, game, WHITE), captures, eps_count, checks);
// eps_count = 0;
// captures = 0;
// checks = 0;
// totalMoves = 0;
// console.log(getMovesTilPly(3, game, WHITE), captures, eps_count, checks);
// eps_count = 0;
// captures = 0;
// checks = 0;
// totalMoves = 0;
// console.log(
//     getMovesTilPly(4, game, WHITE),
//     captures,
//     eps_count,
//     checks,
//     checkmates,
// );
// eps_count = 0;
console.log(
    getMovesTilPly(5, game, WHITE),
    captures,
    eps_count,
    checks,
    checkmates,
);

// game.makeMove([6, 5], [4, 5]);
// game.printBoard();
// game.makeMove([1, 4], [3, 4]);
// game.printBoard();
// game.makeMove([6, 2], [4, 2]);
// game.printBoard();
// game.makeMove([0, 3], [4, 7]);
// game.printBoard();
