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

    outOfBounds(idx) {
        if (idx < 0 || idx > this.board.length) {
            return true;
        }
        return this.board[idx] == "*";
    }

    isEmpty(idx) {
        if (this.outOfBounds(idx)) {
            throw new Error("Index *" + idx + "* is out of bounds");
        }
        return this.board[idx] == ".";
    }

    getPiece(idx) {
        if (this.isEmpty(idx)) {
            console.log("en passant:", this.enPassantTarget);
            console.log("previous ep:", this.prevEPTarget);
            console.log(idx, this.getRowCol(idx));
            this.printBoard();
            throw Error("Cell is empty, no piece here");
        }

        let symbol = this.board[idx];
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

    inCheck(color) {
        let foe = color == "white" ? "black" : "white";
        for (let i = 0; i < this.board.length; i++) {
            if (this.outOfBounds(i) || this.isEmpty(i)) {
                continue;
            }
            let p = this.getPiece(i);
            if (p.color == foe) {
                if (p.isChecking(i)) {
                    return true;
                }
            }
        }
        return false;
    }

    inCheckmate(color) {
        if (!this.inCheck(color)) {
            return false;
        }

        return Object.keys(this.allLegalMoves(color)).length == 0;
    }

    move(start, end) {
        let from = this.getIndex(...start);
        let to = this.getIndex(...end);
        let movedP = this.getPiece(from);
        let capt = this.board[to] != ".";
        let captP = this.board[to];
        let epCapt = false;
        let chck = false;
        let chmt = false;

        let valid = movedP.legalMoves(...start).includes(to);
        if (valid) {
            if (movedP instanceof Pawn && Math.abs(to - from) == 20) {
                this.prevEPTarget = this.enPassantTarget;
                this.enPassantTarget = to - movedP.dir;
            }
            // else if (movedP instanceof Pawn && to == this.enPassantTarget) {
            // debugger;
            // let captured = to + (movedP.color == "white" ? 10 : -10);
            // epCapt = true;
            // captP = this.board[captured];
            // this.board[captured] = ".";
            // }
            else {
                this.prevEPTarget = this.enPassantTarget;
                this.enPassantTarget = null;
            }

            this.board[to] = this.board[from];
            this.board[from] = ".";
        } else {
            let msg = `Invalid move: piece [${
                this.board[from]
            }] cannot move to *${this.getRowCol(to)}*`;
            this.printBoard();
            console.log("HISTORY ------------------");
            console.log(this.history);
            console.log("Indices:", [from, to], " - RowCol: " + [start, end]);
            throw new Error(msg);
        }

        this.history.push([
            from,
            to,
            this.board[to],
            captP,
            epCapt,
            this.prevEPTarget,
        ]);
        if (this.inCheck(movedP.color == "white" ? "black" : "white")) {
            chck = true;
        }
        if (this.inCheckmate(movedP.color == "white" ? "black" : "white")) {
            chmt = true;
        }
        return {
            capture: capt,
            check: chck,
            checkmate: chmt,
            enPassant: epCapt,
        };
    }

    undo() {
        let [from, to, piece, capt, epCapt, prevEP] = this.history.pop();
        this.board[from] = piece;

        if (capt != "." && !epCapt) {
            this.board[to] = capt;
        } else {
            this.board[to] = ".";
        }

        if (epCapt) {
            this.board[prevEP + (piece == "♙" ? 10 : -10)] = capt;
        }
        this.enPassantTarget = prevEP;
    }

    isSafe(from, to) {
        let movedPiece = this.board[from];
        let endPiece = this.board[to];
        let color = "♔♕♖♗♘♙".includes(movedPiece) ? "white" : "black";

        this.board[to] = this.board[from];
        this.board[from] = ".";

        let safe = !this.inCheck(color);

        this.board[from] = movedPiece;
        this.board[to] = endPiece;

        return safe;
    }

    _willCheck(from, to) {
        let movedPiece = this.board[from];
        let endPiece = this.board[to];
        let color = "♔♕♖♗♘♙".includes(movedPiece) ? "white" : "black";
        let oppClr = color == "white" ? "black" : "white";

        this.board[to] = this.board[from];
        this.board[from] = ".";

        let isCheck = {
            check: this.inCheck(oppClr),
            checkmate: this.inCheckmate(oppClr),
        };

        this.board[from] = movedPiece;
        this.board[to] = endPiece;

        return isCheck;
    }

    allLegalMoves(color) {
        let moves = {};
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i] == "*" || this.isEmpty(i)) {
                continue;
            }
            let piece = this.getPiece(i);
            if (piece && piece.color == color) {
                let pm = piece.legalMoves(...this.getRowCol(i));
                if (pm.length > 0) {
                    moves[i] = pm;
                }
            }
        }
        return moves;
    }

    kingPos(color) {
        let king = color == "white" ? "♔" : "♚";
        let idx = this.board.indexOf(king);
        return idx;
    }

    _toStandard(from, to) {
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
        let ch = "";
        let chInfo = this._willCheck(
            this.getIndex(...from),
            this.getIndex(...to),
        );
        if (captured != ".") {
            if (p == "") {
                c = String.fromCharCode(97 + from[1]) + "x";
            } else {
                c = "x";
            }
        }
        if (chInfo.check) {
            ch = "+";
            if (chInfo.checkmate) {
                ch = "#";
            }
        }
        return `${p.toUpperCase()}${c}${String.fromCharCode(97 + to[1])}${
            8 - to[0]
        }${ch}`;
    }
}

class Piece {
    DIAGONALS = [-11, -9, 9, 11];
    CARDINALS = [-10, -1, 1, 10];
    L_SHAPED = [-21, -19, -12, -8, 8, 12, 19, 21];

    constructor(color, board) {
        this.board = board;
        this.color = color;
    }

    legalMoves() {
        throw new Error("Method [legalMoves] cannot be used on base class");
    }

    adNauseum(idx) {
        let moves = [];
        for (let d of this.deltas) {
            let nidx = idx + d;
            while (!this.board.outOfBounds(nidx)) {
                if (this.board.isEmpty(nidx)) {
                    if (this.board.isSafe(idx, nidx)) {
                        moves.push(nidx);
                    }
                } else {
                    let piece = this.board.getPiece(nidx);
                    if (
                        piece &&
                        piece.color != this.color &&
                        this.board.isSafe(idx, nidx)
                    ) {
                        moves.push(nidx);
                    }
                    break;
                }
                nidx += d;
            }
        }
        return moves;
    }

    isChecking(idx) {
        for (let d of this.deltas) {
            let nidx = idx + d;
            while (!this.board.outOfBounds(nidx)) {
                if (!this.board.isEmpty(nidx)) {
                    let piece = this.board.getPiece(nidx);
                    if (
                        piece &&
                        piece.color != this.color &&
                        piece instanceof King
                    ) {
                        return true;
                    } else {
                        break;
                    }
                }
                nidx += d;
            }
        }
        return false;
    }
}

class Rook extends Piece {
    constructor(color, board) {
        super();
        this.color = color;
        this.board = board;
        this.deltas = this.CARDINALS;
    }

    legalMoves(row, col) {
        return this.adNauseum(this.board.getIndex(row, col));
    }
}

class Bishop extends Piece {
    constructor(color, board) {
        super(color, board);
        this.deltas = this.DIAGONALS;
    }

    legalMoves(row, col) {
        return this.adNauseum(this.board.getIndex(row, col));
    }
}

class Queen extends Piece {
    constructor(color, board) {
        super(color, board);
        this.deltas = this.DIAGONALS.concat(this.CARDINALS);
    }

    legalMoves(row, col) {
        return this.adNauseum(this.board.getIndex(row, col));
    }
}

class Knight extends Piece {
    constructor(color, board) {
        super(color, board);
        this.deltas = this.L_SHAPED;
    }

    legalMoves(row, col) {
        let moves = [];
        let idx = this.board.getIndex(row, col);
        for (let d of this.deltas) {
            let nidx = idx + d;
            if (!this.board.outOfBounds(nidx)) {
                if (this.board.isEmpty(nidx)) {
                    if (this.board.isSafe(idx, nidx)) {
                        moves.push(nidx);
                    }
                } else {
                    let piece = this.board.getPiece(nidx);
                    if (
                        piece &&
                        piece.color != this.color &&
                        this.board.isSafe(idx, nidx)
                    ) {
                        moves.push(nidx);
                    }
                    continue;
                }
            }
        }
        return moves;
    }

    isChecking(idx) {
        for (let d of this.deltas) {
            let nidx = idx + d;
            if (!this.board.outOfBounds(nidx)) {
                if (!this.board.isEmpty(nidx)) {
                    let piece = this.board.getPiece(nidx);
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
        return false;
    }
}

class King extends Piece {
    constructor(color, board) {
        super(color, board);
        this.deltas = this.DIAGONALS.concat(this.CARDINALS);
    }

    legalMoves(row, col) {
        let moves = [];
        let idx = this.board.getIndex(row, col);
        for (let d of this.deltas) {
            let nidx = idx + d;
            if (!this.board.outOfBounds(nidx)) {
                if (this.board.isEmpty(nidx)) {
                    if (this.board.isSafe(idx, nidx)) {
                        moves.push(nidx);
                    }
                } else {
                    let piece = this.board.getPiece(nidx);
                    if (
                        piece &&
                        piece.color != this.color &&
                        this.board.isSafe(idx, nidx)
                    ) {
                        moves.push(nidx);
                    }
                    continue;
                }
            }
        }
        return moves;
    }

    isChecking(idx) {
        return false;
    }
}

class Pawn extends Piece {
    constructor(color, board) {
        super(color, board);
        this.dir = color === "white" ? -10 : 10;
        this.start = color === "white" ? 8 : 3;
    }

    legalMoves(row, col) {
        let moves = [];
        let idx = this.board.getIndex(row, col);
        if (!this.board.outOfBounds(idx + this.dir)) {
            if (this.board.isEmpty(idx + this.dir)) {
                if (this.board.isSafe(idx, idx + this.dir)) {
                    moves.push(idx + this.dir);
                }
                if (Math.floor(idx / 10) == this.start) {
                    if (this.board.isEmpty(idx + this.dir * 2)) {
                        if (this.board.isSafe(idx, idx + this.dir * 2)) {
                            moves.push(idx + this.dir * 2);
                        }
                    }
                }
            }
        }

        for (let d of [(11 * this.dir) / 10, (9 * this.dir) / 10]) {
            let nidx = idx + d;
            if (!this.board.outOfBounds(nidx)) {
                if (!this.board.isEmpty(nidx)) {
                    let piece = this.board.getPiece(nidx);
                    if (
                        piece &&
                        piece.color != this.color &&
                        this.board.isSafe(idx, nidx)
                    ) {
                        moves.push(nidx);
                    }
                } else if (
                    this.board.enPassantTarget &&
                    nidx == this.board.enPassantTarget &&
                    !this.board.isEmpty(nidx - this.dir)
                ) {
                    let target = this.board.getPiece(nidx - this.dir);
                    if (
                        target &&
                        target instanceof Pawn &&
                        target.color != this.color &&
                        this.board.isSafe(idx, nidx)
                    ) {
                        moves.push(nidx);
                    }
                }
            }
        }
        return moves;
    }

    isChecking(idx) {
        for (let d of [(11 * this.dir) / 10, (9 * this.dir) / 10]) {
            let nidx = idx + d;
            if (!this.board.outOfBounds(nidx)) {
                if (!this.board.isEmpty(nidx)) {
                    let piece = this.board.getPiece(nidx);
                    if (
                        piece &&
                        piece.color != this.color &&
                        this.board.isSafe(idx, nidx) &&
                        piece instanceof King
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}

const b = new Board();

let capts = 0;
let chcks = 0;
let chmts = 0;
let eps = 0;
let total = 0;
function countMovesPly(ply, color = "white") {
    if (ply == 0) {
        total += 1;
        return 1;
    }
    let count = 0;

    let moves = b.allLegalMoves(color);
    for (const [p, mvs] of Object.entries(moves)) {
        for (let mv of mvs) {
            let i = b.move(b.getRowCol(p), b.getRowCol(mv));
            if (i.capture) {
                capts++;
            }
            if (i.enPassant) {
                eps++;
                capts++;
            }
            if (i.check) {
                chcks++;
                if (i.checkmate) {
                    chmts++;
                }
            }
            count += countMovesPly(
                ply - 1,
                color == "white" ? "black" : "white",
            );
            b.undo();
            if (total % 100000 == 0) {
                console.log(total);
            }
        }
    }

    return count;
}

const getSeqs = (ply, color = "white", seq = "", hash = {}) => {
    if (ply == 0) {
        if (seq.includes("+")) {
            hash[seq.substring(0, seq.length - 1)] = true;
        }
        return;
    }
    let moves = b.allLegalMoves(color);
    for (const [p, mvs] of Object.entries(moves)) {
        for (let mv of mvs) {
            let std = b.toStandard(b.getRowCol(p), b.getRowCol(mv));
            b.move(b.getRowCol(p), b.getRowCol(mv));
            getSeqs(
                ply - 1,
                color == "white" ? "black" : "white",
                `${seq}${std},`,
                hash,
            );
            b.undo();
        }
    }

    return hash;
};

// console.log(countMovesPly(4), capts, chcks, chmts);
// console.log(197281, 34 + 1576, 12 + 469, 8, "expected");
// console.log(countMovesPly(5), capts, eps, chcks, chmts);
// console.log(
//     4865609,
//     34 + 1576 + 82719,
//     258,
//     12 + 469 + 27351,
//     8 + 347,
//     "expected",
// );
console.log(countMovesPly(6), capts, eps, chcks, chmts);
console.log(
    119060324,
    34 + 1576 + 82719 + 2812008,
    258 + 5248,
    12 + 469 + 27351 + 809099,
    8 + 347 + 10828,
    "expected",
);
// console.log(getSeqs(5));

// b.printBoard();
// b.move([6, 4], [4, 4]);
// b.printBoard();
// b.move([1, 5], [3, 5]);
// b.printBoard();
// console.log(b.toStandard([7, 3], [3, 7]));
// console.log(b.willCheck(b.getIndex(7, 3), b.getIndex(3, 7)));

// b.move([6, 0], [4, 0]);
// b.printBoard();
// b.move([1, 2], [2, 2]);
// b.printBoard();
// b.move([4, 0], [3, 0]);
// b.printBoard();
// b.move([1, 1], [3, 1]);
// b.printBoard();
// console.log(b.enPassantTarget);
// const p = b.getPiece(b.getIndex(3, 0));
// console.assert(p.legalMoves(3, 0).includes(b.enPassantTarget));

// b.undo();
// b.printBoard();
// // console.log(b.isSafe([1, 4], [2, 4], "black"));
// console.log(b.inCheck("white"));
// console.log(b.inCheckmate("white"));
// console.log(b.enPassantTarget);
