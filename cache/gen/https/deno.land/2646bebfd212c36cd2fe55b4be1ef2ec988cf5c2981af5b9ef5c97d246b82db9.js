import { escapeForWithinString, getStringFromStrOrFunc } from "./utils/string_utils.ts";
var /** @internal */ CommentChar;
(function(CommentChar) {
    CommentChar[CommentChar["Line"] = 0] = "Line";
    CommentChar[CommentChar["Star"] = 1] = "Star";
})(CommentChar || (CommentChar = {}));
// Using the char codes is a performance improvement (about 5.5% faster when writing because it eliminates additional string allocations).
const CHARS = {
    BACK_SLASH: "\\".charCodeAt(0),
    FORWARD_SLASH: "/".charCodeAt(0),
    NEW_LINE: "\n".charCodeAt(0),
    CARRIAGE_RETURN: "\r".charCodeAt(0),
    ASTERISK: "*".charCodeAt(0),
    DOUBLE_QUOTE: "\"".charCodeAt(0),
    SINGLE_QUOTE: "'".charCodeAt(0),
    BACK_TICK: "`".charCodeAt(0),
    OPEN_BRACE: "{".charCodeAt(0),
    CLOSE_BRACE: "}".charCodeAt(0),
    DOLLAR_SIGN: "$".charCodeAt(0),
    SPACE: " ".charCodeAt(0),
    TAB: "\t".charCodeAt(0)
};
const isCharToHandle = new Set([
    CHARS.BACK_SLASH,
    CHARS.FORWARD_SLASH,
    CHARS.NEW_LINE,
    CHARS.CARRIAGE_RETURN,
    CHARS.ASTERISK,
    CHARS.DOUBLE_QUOTE,
    CHARS.SINGLE_QUOTE,
    CHARS.BACK_TICK,
    CHARS.OPEN_BRACE,
    CHARS.CLOSE_BRACE
]);
/**
 * Code writer that assists with formatting and visualizing blocks of JavaScript or TypeScript code.
 */ export default class CodeBlockWriter {
    /** @internal */ _indentationText;
    /** @internal */ _newLine;
    /** @internal */ _useTabs;
    /** @internal */ _quoteChar;
    /** @internal */ _indentNumberOfSpaces;
    /** @internal */ _currentIndentation = 0;
    /** @internal */ _queuedIndentation;
    /** @internal */ _queuedOnlyIfNotBlock;
    /** @internal */ _length = 0;
    /** @internal */ _newLineOnNextWrite = false;
    /** @internal */ _currentCommentChar = undefined;
    /** @internal */ _stringCharStack = [];
    /** @internal */ _isInRegEx = false;
    /** @internal */ _isOnFirstLineOfBlock = true;
    // An array of strings is used rather than a single string because it was
    // found to be ~11x faster when printing a 10K line file (~11s to ~1s).
    /** @internal */ _texts = [];
    /**
   * Constructor.
   * @param opts - Options for the writer.
   */ constructor(opts = {}){
        this._newLine = opts.newLine || "\n";
        this._useTabs = opts.useTabs || false;
        this._indentNumberOfSpaces = opts.indentNumberOfSpaces || 4;
        this._indentationText = getIndentationText(this._useTabs, this._indentNumberOfSpaces);
        this._quoteChar = opts.useSingleQuote ? "'" : `"`;
    }
    /**
   * Gets the options.
   */ getOptions() {
        return {
            indentNumberOfSpaces: this._indentNumberOfSpaces,
            newLine: this._newLine,
            useTabs: this._useTabs,
            useSingleQuote: this._quoteChar === "'"
        };
    }
    queueIndentationLevel(countOrText) {
        this._queuedIndentation = this._getIndentationLevelFromArg(countOrText);
        this._queuedOnlyIfNotBlock = undefined;
        return this;
    }
    /**
   * Writes the text within the provided action with hanging indentation.
   * @param action - Action to perform with hanging indentation.
   */ hangingIndent(action) {
        return this._withResetIndentation(()=>this.queueIndentationLevel(this.getIndentationLevel() + 1), action);
    }
    /**
   * Writes the text within the provided action with hanging indentation unless writing a block.
   * @param action - Action to perform with hanging indentation unless a block is written.
   */ hangingIndentUnlessBlock(action) {
        return this._withResetIndentation(()=>{
            this.queueIndentationLevel(this.getIndentationLevel() + 1);
            this._queuedOnlyIfNotBlock = true;
        }, action);
    }
    setIndentationLevel(countOrText) {
        this._currentIndentation = this._getIndentationLevelFromArg(countOrText);
        return this;
    }
    withIndentationLevel(countOrText, action) {
        return this._withResetIndentation(()=>this.setIndentationLevel(countOrText), action);
    }
    /** @internal */ _withResetIndentation(setStateAction, writeAction) {
        const previousState = this._getIndentationState();
        setStateAction();
        try {
            writeAction();
        } finally{
            this._setIndentationState(previousState);
        }
        return this;
    }
    /**
   * Gets the current indentation level.
   */ getIndentationLevel() {
        return this._currentIndentation;
    }
    /**
   * Writes a block using braces.
   * @param block - Write using the writer within this block.
   */ block(block) {
        this._newLineIfNewLineOnNextWrite();
        if (this.getLength() > 0 && !this.isLastNewLine()) {
            this.spaceIfLastNot();
        }
        this.inlineBlock(block);
        this._newLineOnNextWrite = true;
        return this;
    }
    /**
   * Writes an inline block with braces.
   * @param block - Write using the writer within this block.
   */ inlineBlock(block) {
        this._newLineIfNewLineOnNextWrite();
        this.write("{");
        this._indentBlockInternal(block);
        this.newLineIfLastNot().write("}");
        return this;
    }
    indent(timesOrBlock = 1) {
        if (typeof timesOrBlock === "number") {
            this._newLineIfNewLineOnNextWrite();
            return this.write(this._indentationText.repeat(timesOrBlock));
        } else {
            this._indentBlockInternal(timesOrBlock);
            if (!this.isLastNewLine()) {
                this._newLineOnNextWrite = true;
            }
            return this;
        }
    }
    /** @internal */ _indentBlockInternal(block) {
        if (this.getLastChar() != null) {
            this.newLineIfLastNot();
        }
        this._currentIndentation++;
        this._isOnFirstLineOfBlock = true;
        if (block != null) {
            block();
        }
        this._isOnFirstLineOfBlock = false;
        this._currentIndentation = Math.max(0, this._currentIndentation - 1);
    }
    conditionalWriteLine(condition, strOrFunc) {
        if (condition) {
            this.writeLine(getStringFromStrOrFunc(strOrFunc));
        }
        return this;
    }
    /**
   * Writes a line of text.
   * @param text - String to write.
   */ writeLine(text) {
        this._newLineIfNewLineOnNextWrite();
        if (this.getLastChar() != null) {
            this.newLineIfLastNot();
        }
        this._writeIndentingNewLines(text);
        this.newLine();
        return this;
    }
    /**
   * Writes a newline if the last line was not a newline.
   */ newLineIfLastNot() {
        this._newLineIfNewLineOnNextWrite();
        if (!this.isLastNewLine()) {
            this.newLine();
        }
        return this;
    }
    /**
   * Writes a blank line if the last written text was not a blank line.
   */ blankLineIfLastNot() {
        if (!this.isLastBlankLine()) {
            this.blankLine();
        }
        return this;
    }
    /**
   * Writes a blank line if the condition is true.
   * @param condition - Condition to evaluate.
   */ conditionalBlankLine(condition) {
        if (condition) {
            this.blankLine();
        }
        return this;
    }
    /**
   * Writes a blank line.
   */ blankLine() {
        return this.newLineIfLastNot().newLine();
    }
    /**
   * Writes a newline if the condition is true.
   * @param condition - Condition to evaluate.
   */ conditionalNewLine(condition) {
        if (condition) {
            this.newLine();
        }
        return this;
    }
    /**
   * Writes a newline.
   */ newLine() {
        this._newLineOnNextWrite = false;
        this._baseWriteNewline();
        return this;
    }
    quote(text) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines(text == null ? this._quoteChar : this._quoteChar + escapeForWithinString(text, this._quoteChar) + this._quoteChar);
        return this;
    }
    /**
   * Writes a space if the last character was not a space.
   */ spaceIfLastNot() {
        this._newLineIfNewLineOnNextWrite();
        if (!this.isLastSpace()) {
            this._writeIndentingNewLines(" ");
        }
        return this;
    }
    /**
   * Writes a space.
   * @param times - Number of times to write a space.
   */ space(times = 1) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines(" ".repeat(times));
        return this;
    }
    /**
   * Writes a tab if the last character was not a tab.
   */ tabIfLastNot() {
        this._newLineIfNewLineOnNextWrite();
        if (!this.isLastTab()) {
            this._writeIndentingNewLines("\t");
        }
        return this;
    }
    /**
   * Writes a tab.
   * @param times - Number of times to write a tab.
   */ tab(times = 1) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines("\t".repeat(times));
        return this;
    }
    conditionalWrite(condition, textOrFunc) {
        if (condition) {
            this.write(getStringFromStrOrFunc(textOrFunc));
        }
        return this;
    }
    /**
   * Writes the provided text.
   * @param text - Text to write.
   */ write(text) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines(text);
        return this;
    }
    /**
   * Writes text to exit a comment if in a comment.
   */ closeComment() {
        const commentChar = this._currentCommentChar;
        switch(commentChar){
            case CommentChar.Line:
                this.newLine();
                break;
            case CommentChar.Star:
                if (!this.isLastNewLine()) {
                    this.spaceIfLastNot();
                }
                this.write("*/");
                break;
            default:
                {
                    const _assertUndefined = commentChar;
                    break;
                }
        }
        return this;
    }
    /**
   * Inserts text at the provided position.
   *
   * This method is "unsafe" because it won't update the state of the writer unless
   * inserting at the end position. It is biased towards being fast at inserting closer
   * to the start or end, but slower to insert in the middle. Only use this if
   * absolutely necessary.
   * @param pos - Position to insert at.
   * @param text - Text to insert.
   */ unsafeInsert(pos, text) {
        const textLength = this._length;
        const texts = this._texts;
        verifyInput();
        if (pos === textLength) {
            return this.write(text);
        }
        updateInternalArray();
        this._length += text.length;
        return this;
        function verifyInput() {
            if (pos < 0) {
                throw new Error(`Provided position of '${pos}' was less than zero.`);
            }
            if (pos > textLength) {
                throw new Error(`Provided position of '${pos}' was greater than the text length of '${textLength}'.`);
            }
        }
        function updateInternalArray() {
            const { index , localIndex  } = getArrayIndexAndLocalIndex();
            if (localIndex === 0) {
                texts.splice(index, 0, text);
            } else if (localIndex === texts[index].length) {
                texts.splice(index + 1, 0, text);
            } else {
                const textItem = texts[index];
                const startText = textItem.substring(0, localIndex);
                const endText = textItem.substring(localIndex);
                texts.splice(index, 1, startText, text, endText);
            }
        }
        function getArrayIndexAndLocalIndex() {
            if (pos < textLength / 2) {
                // start searching from the front
                let endPos = 0;
                for(let i = 0; i < texts.length; i++){
                    const textItem = texts[i];
                    const startPos = endPos;
                    endPos += textItem.length;
                    if (endPos >= pos) {
                        return {
                            index: i,
                            localIndex: pos - startPos
                        };
                    }
                }
            } else {
                // start searching from the back
                let startPos1 = textLength;
                for(let i1 = texts.length - 1; i1 >= 0; i1--){
                    const textItem1 = texts[i1];
                    startPos1 -= textItem1.length;
                    if (startPos1 <= pos) {
                        return {
                            index: i1,
                            localIndex: pos - startPos1
                        };
                    }
                }
            }
            throw new Error("Unhandled situation inserting. This should never happen.");
        }
    }
    /**
   * Gets the length of the string in the writer.
   */ getLength() {
        return this._length;
    }
    /**
   * Gets if the writer is currently in a comment.
   */ isInComment() {
        return this._currentCommentChar !== undefined;
    }
    /**
   * Gets if the writer is currently at the start of the first line of the text, block, or indentation block.
   */ isAtStartOfFirstLineOfBlock() {
        return this.isOnFirstLineOfBlock() && (this.isLastNewLine() || this.getLastChar() == null);
    }
    /**
   * Gets if the writer is currently on the first line of the text, block, or indentation block.
   */ isOnFirstLineOfBlock() {
        return this._isOnFirstLineOfBlock;
    }
    /**
   * Gets if the writer is currently in a string.
   */ isInString() {
        return this._stringCharStack.length > 0 && this._stringCharStack[this._stringCharStack.length - 1] !== CHARS.OPEN_BRACE;
    }
    /**
   * Gets if the last chars written were for a newline.
   */ isLastNewLine() {
        const lastChar = this.getLastChar();
        return lastChar === "\n" || lastChar === "\r";
    }
    /**
   * Gets if the last chars written were for a blank line.
   */ isLastBlankLine() {
        let foundCount = 0;
        // todo: consider extracting out iterating over past characters, but don't use
        // an iterator because it will be slow.
        for(let i = this._texts.length - 1; i >= 0; i--){
            const currentText = this._texts[i];
            for(let j = currentText.length - 1; j >= 0; j--){
                const currentChar = currentText.charCodeAt(j);
                if (currentChar === CHARS.NEW_LINE) {
                    foundCount++;
                    if (foundCount === 2) {
                        return true;
                    }
                } else if (currentChar !== CHARS.CARRIAGE_RETURN) {
                    return false;
                }
            }
        }
        return false;
    }
    /**
   * Gets if the last char written was a space.
   */ isLastSpace() {
        return this.getLastChar() === " ";
    }
    /**
   * Gets if the last char written was a tab.
   */ isLastTab() {
        return this.getLastChar() === "\t";
    }
    /**
   * Gets the last char written.
   */ getLastChar() {
        const charCode = this._getLastCharCodeWithOffset(0);
        return charCode == null ? undefined : String.fromCharCode(charCode);
    }
    /**
   * Gets if the writer ends with the provided text.
   * @param text - Text to check if the writer ends with the provided text.
   */ endsWith(text) {
        const length = this._length;
        return this.iterateLastCharCodes((charCode, index)=>{
            const offset = length - index;
            const textIndex = text.length - offset;
            if (text.charCodeAt(textIndex) !== charCode) {
                return false;
            }
            return textIndex === 0 ? true : undefined;
        }) || false;
    }
    /**
   * Iterates over the writer characters in reverse order. The iteration stops when a non-null or
   * undefined value is returned from the action. The returned value is then returned by the method.
   *
   * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
   * will combine the internal array into a string.
   */ iterateLastChars(action) {
        return this.iterateLastCharCodes((charCode, index)=>action(String.fromCharCode(charCode), index));
    }
    /**
   * Iterates over the writer character char codes in reverse order. The iteration stops when a non-null or
   * undefined value is returned from the action. The returned value is then returned by the method.
   *
   * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
   * will combine the internal array into a string. Additionally, this is slightly more efficient that
   * `iterateLastChars` as this won't allocate a string per character.
   */ iterateLastCharCodes(action) {
        let index = this._length;
        for(let i = this._texts.length - 1; i >= 0; i--){
            const currentText = this._texts[i];
            for(let j = currentText.length - 1; j >= 0; j--){
                index--;
                const result = action(currentText.charCodeAt(j), index);
                if (result != null) {
                    return result;
                }
            }
        }
        return undefined;
    }
    /**
   * Gets the writer's text.
   */ toString() {
        if (this._texts.length > 1) {
            const text = this._texts.join("");
            this._texts.length = 0;
            this._texts.push(text);
        }
        return this._texts[0] || "";
    }
    /** @internal */ static _newLineRegEx = /\r?\n/;
    /** @internal */ _writeIndentingNewLines(text) {
        text = text || "";
        if (text.length === 0) {
            writeIndividual(this, "");
            return;
        }
        const items = text.split(CodeBlockWriter._newLineRegEx);
        items.forEach((s, i)=>{
            if (i > 0) {
                this._baseWriteNewline();
            }
            if (s.length === 0) {
                return;
            }
            writeIndividual(this, s);
        });
        function writeIndividual(writer, s) {
            if (!writer.isInString()) {
                const isAtStartOfLine = writer.isLastNewLine() || writer.getLastChar() == null;
                if (isAtStartOfLine) {
                    writer._writeIndentation();
                }
            }
            writer._updateInternalState(s);
            writer._internalWrite(s);
        }
    }
    /** @internal */ _baseWriteNewline() {
        if (this._currentCommentChar === CommentChar.Line) {
            this._currentCommentChar = undefined;
        }
        const lastStringCharOnStack = this._stringCharStack[this._stringCharStack.length - 1];
        if ((lastStringCharOnStack === CHARS.DOUBLE_QUOTE || lastStringCharOnStack === CHARS.SINGLE_QUOTE) && this._getLastCharCodeWithOffset(0) !== CHARS.BACK_SLASH) {
            this._stringCharStack.pop();
        }
        this._internalWrite(this._newLine);
        this._isOnFirstLineOfBlock = false;
        this._dequeueQueuedIndentation();
    }
    /** @internal */ _dequeueQueuedIndentation() {
        if (this._queuedIndentation == null) {
            return;
        }
        if (this._queuedOnlyIfNotBlock && wasLastBlock(this)) {
            this._queuedIndentation = undefined;
            this._queuedOnlyIfNotBlock = undefined;
        } else {
            this._currentIndentation = this._queuedIndentation;
            this._queuedIndentation = undefined;
        }
        function wasLastBlock(writer) {
            let foundNewLine = false;
            return writer.iterateLastCharCodes((charCode)=>{
                switch(charCode){
                    case CHARS.NEW_LINE:
                        if (foundNewLine) {
                            return false;
                        } else {
                            foundNewLine = true;
                        }
                        break;
                    case CHARS.CARRIAGE_RETURN:
                        return undefined;
                    case CHARS.OPEN_BRACE:
                        return true;
                    default:
                        return false;
                }
            });
        }
    }
    /** @internal */ _updateInternalState(str) {
        for(let i = 0; i < str.length; i++){
            const currentChar = str.charCodeAt(i);
            // This is a performance optimization to short circuit all the checks below. If the current char
            // is not in this set then it won't change any internal state so no need to continue and do
            // so many other checks (this made it 3x faster in one scenario I tested).
            if (!isCharToHandle.has(currentChar)) {
                continue;
            }
            const pastChar = i === 0 ? this._getLastCharCodeWithOffset(0) : str.charCodeAt(i - 1);
            const pastPastChar = i === 0 ? this._getLastCharCodeWithOffset(1) : i === 1 ? this._getLastCharCodeWithOffset(0) : str.charCodeAt(i - 2);
            // handle regex
            if (this._isInRegEx) {
                if (pastChar === CHARS.FORWARD_SLASH && pastPastChar !== CHARS.BACK_SLASH || pastChar === CHARS.NEW_LINE) {
                    this._isInRegEx = false;
                } else {
                    continue;
                }
            } else if (!this.isInString() && !this.isInComment() && isRegExStart(currentChar, pastChar, pastPastChar)) {
                this._isInRegEx = true;
                continue;
            }
            // handle comments
            if (this._currentCommentChar == null && pastChar === CHARS.FORWARD_SLASH && currentChar === CHARS.FORWARD_SLASH) {
                this._currentCommentChar = CommentChar.Line;
            } else if (this._currentCommentChar == null && pastChar === CHARS.FORWARD_SLASH && currentChar === CHARS.ASTERISK) {
                this._currentCommentChar = CommentChar.Star;
            } else if (this._currentCommentChar === CommentChar.Star && pastChar === CHARS.ASTERISK && currentChar === CHARS.FORWARD_SLASH) {
                this._currentCommentChar = undefined;
            }
            if (this.isInComment()) {
                continue;
            }
            // handle strings
            const lastStringCharOnStack = this._stringCharStack.length === 0 ? undefined : this._stringCharStack[this._stringCharStack.length - 1];
            if (pastChar !== CHARS.BACK_SLASH && (currentChar === CHARS.DOUBLE_QUOTE || currentChar === CHARS.SINGLE_QUOTE || currentChar === CHARS.BACK_TICK)) {
                if (lastStringCharOnStack === currentChar) {
                    this._stringCharStack.pop();
                } else if (lastStringCharOnStack === CHARS.OPEN_BRACE || lastStringCharOnStack === undefined) {
                    this._stringCharStack.push(currentChar);
                }
            } else if (pastPastChar !== CHARS.BACK_SLASH && pastChar === CHARS.DOLLAR_SIGN && currentChar === CHARS.OPEN_BRACE && lastStringCharOnStack === CHARS.BACK_TICK) {
                this._stringCharStack.push(currentChar);
            } else if (currentChar === CHARS.CLOSE_BRACE && lastStringCharOnStack === CHARS.OPEN_BRACE) {
                this._stringCharStack.pop();
            }
        }
    }
    /** @internal - This is private, but exposed for testing. */ _getLastCharCodeWithOffset(offset) {
        if (offset >= this._length || offset < 0) {
            return undefined;
        }
        for(let i = this._texts.length - 1; i >= 0; i--){
            const currentText = this._texts[i];
            if (offset >= currentText.length) {
                offset -= currentText.length;
            } else {
                return currentText.charCodeAt(currentText.length - 1 - offset);
            }
        }
        return undefined;
    }
    /** @internal */ _writeIndentation() {
        const flooredIndentation = Math.floor(this._currentIndentation);
        this._internalWrite(this._indentationText.repeat(flooredIndentation));
        const overflow = this._currentIndentation - flooredIndentation;
        if (this._useTabs) {
            if (overflow > 0.5) {
                this._internalWrite(this._indentationText);
            }
        } else {
            const portion = Math.round(this._indentationText.length * overflow);
            // build up the string first, then append it for performance reasons
            let text = "";
            for(let i = 0; i < portion; i++){
                text += this._indentationText[i];
            }
            this._internalWrite(text);
        }
    }
    /** @internal */ _newLineIfNewLineOnNextWrite() {
        if (!this._newLineOnNextWrite) {
            return;
        }
        this._newLineOnNextWrite = false;
        this.newLine();
    }
    /** @internal */ _internalWrite(text) {
        if (text.length === 0) {
            return;
        }
        this._texts.push(text);
        this._length += text.length;
    }
    /** @internal */ static _spacesOrTabsRegEx = /^[ \t]*$/;
    /** @internal */ _getIndentationLevelFromArg(countOrText) {
        if (typeof countOrText === "number") {
            if (countOrText < 0) {
                throw new Error("Passed in indentation level should be greater than or equal to 0.");
            }
            return countOrText;
        } else if (typeof countOrText === "string") {
            if (!CodeBlockWriter._spacesOrTabsRegEx.test(countOrText)) {
                throw new Error("Provided string must be empty or only contain spaces or tabs.");
            }
            const { spacesCount , tabsCount  } = getSpacesAndTabsCount(countOrText);
            return tabsCount + spacesCount / this._indentNumberOfSpaces;
        } else {
            throw new Error("Argument provided must be a string or number.");
        }
    }
    /** @internal */ _setIndentationState(state) {
        this._currentIndentation = state.current;
        this._queuedIndentation = state.queued;
        this._queuedOnlyIfNotBlock = state.queuedOnlyIfNotBlock;
    }
    /** @internal */ _getIndentationState() {
        return {
            current: this._currentIndentation,
            queued: this._queuedIndentation,
            queuedOnlyIfNotBlock: this._queuedOnlyIfNotBlock
        };
    }
}
function isRegExStart(currentChar, pastChar, pastPastChar) {
    return pastChar === CHARS.FORWARD_SLASH && currentChar !== CHARS.FORWARD_SLASH && currentChar !== CHARS.ASTERISK && pastPastChar !== CHARS.ASTERISK && pastPastChar !== CHARS.FORWARD_SLASH;
}
function getIndentationText(useTabs, numberSpaces) {
    if (useTabs) {
        return "\t";
    }
    return Array(numberSpaces + 1).join(" ");
}
function getSpacesAndTabsCount(str) {
    let spacesCount = 0;
    let tabsCount = 0;
    for(let i = 0; i < str.length; i++){
        const charCode = str.charCodeAt(i);
        if (charCode === CHARS.SPACE) {
            spacesCount++;
        } else if (charCode === CHARS.TAB) {
            tabsCount++;
        }
    }
    return {
        spacesCount,
        tabsCount
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHBzOi8vZGVuby5sYW5kL3gvY29kZV9ibG9ja193cml0ZXJAMTEuMC4zL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBlc2NhcGVGb3JXaXRoaW5TdHJpbmcsIGdldFN0cmluZ0Zyb21TdHJPckZ1bmMgfSBmcm9tIFwiLi91dGlscy9zdHJpbmdfdXRpbHMudHNcIjtcblxuLyoqIEBpbnRlcm5hbCAqL1xuZW51bSBDb21tZW50Q2hhciB7XG4gIExpbmUsXG4gIFN0YXIsXG59XG5cbi8qKlxuICogT3B0aW9ucyBmb3IgdGhlIHdyaXRlci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPcHRpb25zIHtcbiAgLyoqXG4gICAqIE5ld2xpbmUgY2hhcmFjdGVyLlxuICAgKiBAcmVtYXJrcyBEZWZhdWx0cyB0byBcXG4uXG4gICAqL1xuICBuZXdMaW5lOiBcIlxcblwiIHwgXCJcXHJcXG5cIjtcbiAgLyoqXG4gICAqIE51bWJlciBvZiBzcGFjZXMgdG8gaW5kZW50IHdoZW4gYHVzZVRhYnNgIGlzIGZhbHNlLlxuICAgKiBAcmVtYXJrcyBEZWZhdWx0cyB0byA0LlxuICAgKi9cbiAgaW5kZW50TnVtYmVyT2ZTcGFjZXM6IG51bWJlcjtcbiAgLyoqXG4gICAqIFdoZXRoZXIgdG8gdXNlIHRhYnMgKHRydWUpIG9yIHNwYWNlcyAoZmFsc2UpLlxuICAgKiBAcmVtYXJrcyBEZWZhdWx0cyB0byBmYWxzZS5cbiAgICovXG4gIHVzZVRhYnM6IGJvb2xlYW47XG4gIC8qKlxuICAgKiBXaGV0aGVyIHRvIHVzZSBhIHNpbmdsZSBxdW90ZSAodHJ1ZSkgb3IgZG91YmxlIHF1b3RlIChmYWxzZSkuXG4gICAqIEByZW1hcmtzIERlZmF1bHRzIHRvIGZhbHNlLlxuICAgKi9cbiAgdXNlU2luZ2xlUXVvdGU6IGJvb2xlYW47XG59XG5cbi8vIFVzaW5nIHRoZSBjaGFyIGNvZGVzIGlzIGEgcGVyZm9ybWFuY2UgaW1wcm92ZW1lbnQgKGFib3V0IDUuNSUgZmFzdGVyIHdoZW4gd3JpdGluZyBiZWNhdXNlIGl0IGVsaW1pbmF0ZXMgYWRkaXRpb25hbCBzdHJpbmcgYWxsb2NhdGlvbnMpLlxuY29uc3QgQ0hBUlMgPSB7XG4gIEJBQ0tfU0xBU0g6IFwiXFxcXFwiLmNoYXJDb2RlQXQoMCksXG4gIEZPUldBUkRfU0xBU0g6IFwiL1wiLmNoYXJDb2RlQXQoMCksXG4gIE5FV19MSU5FOiBcIlxcblwiLmNoYXJDb2RlQXQoMCksXG4gIENBUlJJQUdFX1JFVFVSTjogXCJcXHJcIi5jaGFyQ29kZUF0KDApLFxuICBBU1RFUklTSzogXCIqXCIuY2hhckNvZGVBdCgwKSxcbiAgRE9VQkxFX1FVT1RFOiBcIlxcXCJcIi5jaGFyQ29kZUF0KDApLFxuICBTSU5HTEVfUVVPVEU6IFwiJ1wiLmNoYXJDb2RlQXQoMCksXG4gIEJBQ0tfVElDSzogXCJgXCIuY2hhckNvZGVBdCgwKSxcbiAgT1BFTl9CUkFDRTogXCJ7XCIuY2hhckNvZGVBdCgwKSxcbiAgQ0xPU0VfQlJBQ0U6IFwifVwiLmNoYXJDb2RlQXQoMCksXG4gIERPTExBUl9TSUdOOiBcIiRcIi5jaGFyQ29kZUF0KDApLFxuICBTUEFDRTogXCIgXCIuY2hhckNvZGVBdCgwKSxcbiAgVEFCOiBcIlxcdFwiLmNoYXJDb2RlQXQoMCksXG59O1xuY29uc3QgaXNDaGFyVG9IYW5kbGUgPSBuZXcgU2V0PG51bWJlcj4oW1xuICBDSEFSUy5CQUNLX1NMQVNILFxuICBDSEFSUy5GT1JXQVJEX1NMQVNILFxuICBDSEFSUy5ORVdfTElORSxcbiAgQ0hBUlMuQ0FSUklBR0VfUkVUVVJOLFxuICBDSEFSUy5BU1RFUklTSyxcbiAgQ0hBUlMuRE9VQkxFX1FVT1RFLFxuICBDSEFSUy5TSU5HTEVfUVVPVEUsXG4gIENIQVJTLkJBQ0tfVElDSyxcbiAgQ0hBUlMuT1BFTl9CUkFDRSxcbiAgQ0hBUlMuQ0xPU0VfQlJBQ0UsXG5dKTtcblxuLyoqXG4gKiBDb2RlIHdyaXRlciB0aGF0IGFzc2lzdHMgd2l0aCBmb3JtYXR0aW5nIGFuZCB2aXN1YWxpemluZyBibG9ja3Mgb2YgSmF2YVNjcmlwdCBvciBUeXBlU2NyaXB0IGNvZGUuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIENvZGVCbG9ja1dyaXRlciB7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfaW5kZW50YXRpb25UZXh0OiBzdHJpbmc7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfbmV3TGluZTogXCJcXG5cIiB8IFwiXFxyXFxuXCI7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSByZWFkb25seSBfdXNlVGFiczogYm9vbGVhbjtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIHJlYWRvbmx5IF9xdW90ZUNoYXI6IHN0cmluZztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIHJlYWRvbmx5IF9pbmRlbnROdW1iZXJPZlNwYWNlczogbnVtYmVyO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX2N1cnJlbnRJbmRlbnRhdGlvbiA9IDA7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfcXVldWVkSW5kZW50YXRpb246IG51bWJlciB8IHVuZGVmaW5lZDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9xdWV1ZWRPbmx5SWZOb3RCbG9jazogdHJ1ZSB8IHVuZGVmaW5lZDtcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9sZW5ndGggPSAwO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX25ld0xpbmVPbk5leHRXcml0ZSA9IGZhbHNlO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX2N1cnJlbnRDb21tZW50Q2hhcjogQ29tbWVudENoYXIgfCB1bmRlZmluZWQgPSB1bmRlZmluZWQ7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfc3RyaW5nQ2hhclN0YWNrOiBudW1iZXJbXSA9IFtdO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX2lzSW5SZWdFeCA9IGZhbHNlO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX2lzT25GaXJzdExpbmVPZkJsb2NrID0gdHJ1ZTtcbiAgLy8gQW4gYXJyYXkgb2Ygc3RyaW5ncyBpcyB1c2VkIHJhdGhlciB0aGFuIGEgc2luZ2xlIHN0cmluZyBiZWNhdXNlIGl0IHdhc1xuICAvLyBmb3VuZCB0byBiZSB+MTF4IGZhc3RlciB3aGVuIHByaW50aW5nIGEgMTBLIGxpbmUgZmlsZSAofjExcyB0byB+MXMpLlxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX3RleHRzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3Rvci5cbiAgICogQHBhcmFtIG9wdHMgLSBPcHRpb25zIGZvciB0aGUgd3JpdGVyLlxuICAgKi9cbiAgY29uc3RydWN0b3Iob3B0czogUGFydGlhbDxPcHRpb25zPiA9IHt9KSB7XG4gICAgdGhpcy5fbmV3TGluZSA9IG9wdHMubmV3TGluZSB8fCBcIlxcblwiO1xuICAgIHRoaXMuX3VzZVRhYnMgPSBvcHRzLnVzZVRhYnMgfHwgZmFsc2U7XG4gICAgdGhpcy5faW5kZW50TnVtYmVyT2ZTcGFjZXMgPSBvcHRzLmluZGVudE51bWJlck9mU3BhY2VzIHx8IDQ7XG4gICAgdGhpcy5faW5kZW50YXRpb25UZXh0ID0gZ2V0SW5kZW50YXRpb25UZXh0KHRoaXMuX3VzZVRhYnMsIHRoaXMuX2luZGVudE51bWJlck9mU3BhY2VzKTtcbiAgICB0aGlzLl9xdW90ZUNoYXIgPSBvcHRzLnVzZVNpbmdsZVF1b3RlID8gXCInXCIgOiBgXCJgO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgdGhlIG9wdGlvbnMuXG4gICAqL1xuICBnZXRPcHRpb25zKCk6IE9wdGlvbnMge1xuICAgIHJldHVybiB7XG4gICAgICBpbmRlbnROdW1iZXJPZlNwYWNlczogdGhpcy5faW5kZW50TnVtYmVyT2ZTcGFjZXMsXG4gICAgICBuZXdMaW5lOiB0aGlzLl9uZXdMaW5lLFxuICAgICAgdXNlVGFiczogdGhpcy5fdXNlVGFicyxcbiAgICAgIHVzZVNpbmdsZVF1b3RlOiB0aGlzLl9xdW90ZUNoYXIgPT09IFwiJ1wiLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUXVldWVzIHRoZSBpbmRlbnRhdGlvbiBsZXZlbCBmb3IgdGhlIG5leHQgbGluZXMgd3JpdHRlbi5cbiAgICogQHBhcmFtIGluZGVudGF0aW9uTGV2ZWwgLSBJbmRlbnRhdGlvbiBsZXZlbCB0byBxdWV1ZS5cbiAgICovXG4gIHF1ZXVlSW5kZW50YXRpb25MZXZlbChpbmRlbnRhdGlvbkxldmVsOiBudW1iZXIpOiB0aGlzO1xuICAvKipcbiAgICogUXVldWVzIHRoZSBpbmRlbnRhdGlvbiBsZXZlbCBmb3IgdGhlIG5leHQgbGluZXMgd3JpdHRlbiB1c2luZyB0aGUgcHJvdmlkZWQgaW5kZW50YXRpb24gdGV4dC5cbiAgICogQHBhcmFtIHdoaXRlc3BhY2VUZXh0IC0gR2V0cyB0aGUgaW5kZW50YXRpb24gbGV2ZWwgZnJvbSB0aGUgaW5kZW50YXRpb24gdGV4dC5cbiAgICovXG4gIHF1ZXVlSW5kZW50YXRpb25MZXZlbCh3aGl0ZXNwYWNlVGV4dDogc3RyaW5nKTogdGhpcztcbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBxdWV1ZUluZGVudGF0aW9uTGV2ZWwoY291bnRPclRleHQ6IHN0cmluZyB8IG51bWJlcik6IHRoaXM7XG4gIHF1ZXVlSW5kZW50YXRpb25MZXZlbChjb3VudE9yVGV4dDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gICAgdGhpcy5fcXVldWVkSW5kZW50YXRpb24gPSB0aGlzLl9nZXRJbmRlbnRhdGlvbkxldmVsRnJvbUFyZyhjb3VudE9yVGV4dCk7XG4gICAgdGhpcy5fcXVldWVkT25seUlmTm90QmxvY2sgPSB1bmRlZmluZWQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIHRoZSB0ZXh0IHdpdGhpbiB0aGUgcHJvdmlkZWQgYWN0aW9uIHdpdGggaGFuZ2luZyBpbmRlbnRhdGlvbi5cbiAgICogQHBhcmFtIGFjdGlvbiAtIEFjdGlvbiB0byBwZXJmb3JtIHdpdGggaGFuZ2luZyBpbmRlbnRhdGlvbi5cbiAgICovXG4gIGhhbmdpbmdJbmRlbnQoYWN0aW9uOiAoKSA9PiB2b2lkKTogdGhpcyB7XG4gICAgcmV0dXJuIHRoaXMuX3dpdGhSZXNldEluZGVudGF0aW9uKCgpID0+IHRoaXMucXVldWVJbmRlbnRhdGlvbkxldmVsKHRoaXMuZ2V0SW5kZW50YXRpb25MZXZlbCgpICsgMSksIGFjdGlvbik7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIHRoZSB0ZXh0IHdpdGhpbiB0aGUgcHJvdmlkZWQgYWN0aW9uIHdpdGggaGFuZ2luZyBpbmRlbnRhdGlvbiB1bmxlc3Mgd3JpdGluZyBhIGJsb2NrLlxuICAgKiBAcGFyYW0gYWN0aW9uIC0gQWN0aW9uIHRvIHBlcmZvcm0gd2l0aCBoYW5naW5nIGluZGVudGF0aW9uIHVubGVzcyBhIGJsb2NrIGlzIHdyaXR0ZW4uXG4gICAqL1xuICBoYW5naW5nSW5kZW50VW5sZXNzQmxvY2soYWN0aW9uOiAoKSA9PiB2b2lkKTogdGhpcyB7XG4gICAgcmV0dXJuIHRoaXMuX3dpdGhSZXNldEluZGVudGF0aW9uKCgpID0+IHtcbiAgICAgIHRoaXMucXVldWVJbmRlbnRhdGlvbkxldmVsKHRoaXMuZ2V0SW5kZW50YXRpb25MZXZlbCgpICsgMSk7XG4gICAgICB0aGlzLl9xdWV1ZWRPbmx5SWZOb3RCbG9jayA9IHRydWU7XG4gICAgfSwgYWN0aW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXRzIHRoZSBjdXJyZW50IGluZGVudGF0aW9uIGxldmVsLlxuICAgKiBAcGFyYW0gaW5kZW50YXRpb25MZXZlbCAtIEluZGVudGF0aW9uIGxldmVsIHRvIGJlIGF0LlxuICAgKi9cbiAgc2V0SW5kZW50YXRpb25MZXZlbChpbmRlbnRhdGlvbkxldmVsOiBudW1iZXIpOiB0aGlzO1xuICAvKipcbiAgICogU2V0cyB0aGUgY3VycmVudCBpbmRlbnRhdGlvbiB1c2luZyB0aGUgcHJvdmlkZWQgaW5kZW50YXRpb24gdGV4dC5cbiAgICogQHBhcmFtIHdoaXRlc3BhY2VUZXh0IC0gR2V0cyB0aGUgaW5kZW50YXRpb24gbGV2ZWwgZnJvbSB0aGUgaW5kZW50YXRpb24gdGV4dC5cbiAgICovXG4gIHNldEluZGVudGF0aW9uTGV2ZWwod2hpdGVzcGFjZVRleHQ6IHN0cmluZyk6IHRoaXM7XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgc2V0SW5kZW50YXRpb25MZXZlbChjb3VudE9yVGV4dDogc3RyaW5nIHwgbnVtYmVyKTogdGhpcztcbiAgc2V0SW5kZW50YXRpb25MZXZlbChjb3VudE9yVGV4dDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gICAgdGhpcy5fY3VycmVudEluZGVudGF0aW9uID0gdGhpcy5fZ2V0SW5kZW50YXRpb25MZXZlbEZyb21BcmcoY291bnRPclRleHQpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldHMgdGhlIGluZGVudGF0aW9uIGxldmVsIHdpdGhpbiB0aGUgcHJvdmlkZWQgYWN0aW9uIGFuZCByZXN0b3JlcyB0aGUgd3JpdGVyJ3MgaW5kZW50YXRpb25cbiAgICogc3RhdGUgYWZ0ZXJ3YXJkcy5cbiAgICogQHJlbWFya3MgUmVzdG9yZXMgdGhlIHdyaXRlcidzIHN0YXRlIGFmdGVyIHRoZSBhY3Rpb24uXG4gICAqIEBwYXJhbSBpbmRlbnRhdGlvbkxldmVsIC0gSW5kZW50YXRpb24gbGV2ZWwgdG8gc2V0LlxuICAgKiBAcGFyYW0gYWN0aW9uIC0gQWN0aW9uIHRvIHBlcmZvcm0gd2l0aCB0aGUgaW5kZW50YXRpb24uXG4gICAqL1xuICB3aXRoSW5kZW50YXRpb25MZXZlbChpbmRlbnRhdGlvbkxldmVsOiBudW1iZXIsIGFjdGlvbjogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIC8qKlxuICAgKiBTZXRzIHRoZSBpbmRlbnRhdGlvbiBsZXZlbCB3aXRoIHRoZSBwcm92aWRlZCBpbmRlbnRhdGlvbiB0ZXh0IHdpdGhpbiB0aGUgcHJvdmlkZWQgYWN0aW9uXG4gICAqIGFuZCByZXN0b3JlcyB0aGUgd3JpdGVyJ3MgaW5kZW50YXRpb24gc3RhdGUgYWZ0ZXJ3YXJkcy5cbiAgICogQHBhcmFtIHdoaXRlc3BhY2VUZXh0IC0gR2V0cyB0aGUgaW5kZW50YXRpb24gbGV2ZWwgZnJvbSB0aGUgaW5kZW50YXRpb24gdGV4dC5cbiAgICogQHBhcmFtIGFjdGlvbiAtIEFjdGlvbiB0byBwZXJmb3JtIHdpdGggdGhlIGluZGVudGF0aW9uLlxuICAgKi9cbiAgd2l0aEluZGVudGF0aW9uTGV2ZWwod2hpdGVzcGFjZVRleHQ6IHN0cmluZywgYWN0aW9uOiAoKSA9PiB2b2lkKTogdGhpcztcbiAgd2l0aEluZGVudGF0aW9uTGV2ZWwoY291bnRPclRleHQ6IHN0cmluZyB8IG51bWJlciwgYWN0aW9uOiAoKSA9PiB2b2lkKSB7XG4gICAgcmV0dXJuIHRoaXMuX3dpdGhSZXNldEluZGVudGF0aW9uKCgpID0+IHRoaXMuc2V0SW5kZW50YXRpb25MZXZlbChjb3VudE9yVGV4dCksIGFjdGlvbik7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX3dpdGhSZXNldEluZGVudGF0aW9uKHNldFN0YXRlQWN0aW9uOiAoKSA9PiB2b2lkLCB3cml0ZUFjdGlvbjogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IHByZXZpb3VzU3RhdGUgPSB0aGlzLl9nZXRJbmRlbnRhdGlvblN0YXRlKCk7XG4gICAgc2V0U3RhdGVBY3Rpb24oKTtcbiAgICB0cnkge1xuICAgICAgd3JpdGVBY3Rpb24oKTtcbiAgICB9IGZpbmFsbHkge1xuICAgICAgdGhpcy5fc2V0SW5kZW50YXRpb25TdGF0ZShwcmV2aW91c1N0YXRlKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgY3VycmVudCBpbmRlbnRhdGlvbiBsZXZlbC5cbiAgICovXG4gIGdldEluZGVudGF0aW9uTGV2ZWwoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudEluZGVudGF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhIGJsb2NrIHVzaW5nIGJyYWNlcy5cbiAgICogQHBhcmFtIGJsb2NrIC0gV3JpdGUgdXNpbmcgdGhlIHdyaXRlciB3aXRoaW4gdGhpcyBibG9jay5cbiAgICovXG4gIGJsb2NrKGJsb2NrPzogKCkgPT4gdm9pZCk6IHRoaXMge1xuICAgIHRoaXMuX25ld0xpbmVJZk5ld0xpbmVPbk5leHRXcml0ZSgpO1xuICAgIGlmICh0aGlzLmdldExlbmd0aCgpID4gMCAmJiAhdGhpcy5pc0xhc3ROZXdMaW5lKCkpIHtcbiAgICAgIHRoaXMuc3BhY2VJZkxhc3ROb3QoKTtcbiAgICB9XG4gICAgdGhpcy5pbmxpbmVCbG9jayhibG9jayk7XG4gICAgdGhpcy5fbmV3TGluZU9uTmV4dFdyaXRlID0gdHJ1ZTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYW4gaW5saW5lIGJsb2NrIHdpdGggYnJhY2VzLlxuICAgKiBAcGFyYW0gYmxvY2sgLSBXcml0ZSB1c2luZyB0aGUgd3JpdGVyIHdpdGhpbiB0aGlzIGJsb2NrLlxuICAgKi9cbiAgaW5saW5lQmxvY2soYmxvY2s/OiAoKSA9PiB2b2lkKTogdGhpcyB7XG4gICAgdGhpcy5fbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCk7XG4gICAgdGhpcy53cml0ZShcIntcIik7XG4gICAgdGhpcy5faW5kZW50QmxvY2tJbnRlcm5hbChibG9jayk7XG4gICAgdGhpcy5uZXdMaW5lSWZMYXN0Tm90KCkud3JpdGUoXCJ9XCIpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogSW5kZW50cyB0aGUgY29kZSBvbmUgbGV2ZWwgZm9yIHRoZSBjdXJyZW50IGxpbmUuXG4gICAqL1xuICBpbmRlbnQodGltZXM/OiBudW1iZXIpOiB0aGlzO1xuICAvKipcbiAgICogSW5kZW50cyBhIGJsb2NrIG9mIGNvZGUuXG4gICAqIEBwYXJhbSBibG9jayAtIEJsb2NrIHRvIGluZGVudC5cbiAgICovXG4gIGluZGVudChibG9jazogKCkgPT4gdm9pZCk6IHRoaXM7XG4gIGluZGVudCh0aW1lc09yQmxvY2s6IG51bWJlciB8ICgoKSA9PiB2b2lkKSA9IDEpIHtcbiAgICBpZiAodHlwZW9mIHRpbWVzT3JCbG9jayA9PT0gXCJudW1iZXJcIikge1xuICAgICAgdGhpcy5fbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCk7XG4gICAgICByZXR1cm4gdGhpcy53cml0ZSh0aGlzLl9pbmRlbnRhdGlvblRleHQucmVwZWF0KHRpbWVzT3JCbG9jaykpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9pbmRlbnRCbG9ja0ludGVybmFsKHRpbWVzT3JCbG9jayk7XG4gICAgICBpZiAoIXRoaXMuaXNMYXN0TmV3TGluZSgpKSB7XG4gICAgICAgIHRoaXMuX25ld0xpbmVPbk5leHRXcml0ZSA9IHRydWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX2luZGVudEJsb2NrSW50ZXJuYWwoYmxvY2s/OiAoKSA9PiB2b2lkKSB7XG4gICAgaWYgKHRoaXMuZ2V0TGFzdENoYXIoKSAhPSBudWxsKSB7XG4gICAgICB0aGlzLm5ld0xpbmVJZkxhc3ROb3QoKTtcbiAgICB9XG4gICAgdGhpcy5fY3VycmVudEluZGVudGF0aW9uKys7XG4gICAgdGhpcy5faXNPbkZpcnN0TGluZU9mQmxvY2sgPSB0cnVlO1xuICAgIGlmIChibG9jayAhPSBudWxsKSB7XG4gICAgICBibG9jaygpO1xuICAgIH1cbiAgICB0aGlzLl9pc09uRmlyc3RMaW5lT2ZCbG9jayA9IGZhbHNlO1xuICAgIHRoaXMuX2N1cnJlbnRJbmRlbnRhdGlvbiA9IE1hdGgubWF4KDAsIHRoaXMuX2N1cnJlbnRJbmRlbnRhdGlvbiAtIDEpO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbmRpdGlvbmFsbHkgd3JpdGVzIGEgbGluZSBvZiB0ZXh0LlxuICAgKiBAcGFyYW0gY29uZGl0aW9uIC0gQ29uZGl0aW9uIHRvIGV2YWx1YXRlLlxuICAgKiBAcGFyYW0gdGV4dEZ1bmMgLSBBIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHN0cmluZyB0byB3cml0ZSBpZiB0aGUgY29uZGl0aW9uIGlzIHRydWUuXG4gICAqL1xuICBjb25kaXRpb25hbFdyaXRlTGluZShjb25kaXRpb246IGJvb2xlYW4gfCB1bmRlZmluZWQsIHRleHRGdW5jOiAoKSA9PiBzdHJpbmcpOiB0aGlzO1xuICAvKipcbiAgICogQ29uZGl0aW9uYWxseSB3cml0ZXMgYSBsaW5lIG9mIHRleHQuXG4gICAqIEBwYXJhbSBjb25kaXRpb24gLSBDb25kaXRpb24gdG8gZXZhbHVhdGUuXG4gICAqIEBwYXJhbSB0ZXh0IC0gVGV4dCB0byB3cml0ZSBpZiB0aGUgY29uZGl0aW9uIGlzIHRydWUuXG4gICAqL1xuICBjb25kaXRpb25hbFdyaXRlTGluZShjb25kaXRpb246IGJvb2xlYW4gfCB1bmRlZmluZWQsIHRleHQ6IHN0cmluZyk6IHRoaXM7XG4gIGNvbmRpdGlvbmFsV3JpdGVMaW5lKGNvbmRpdGlvbjogYm9vbGVhbiB8IHVuZGVmaW5lZCwgc3RyT3JGdW5jOiBzdHJpbmcgfCAoKCkgPT4gc3RyaW5nKSkge1xuICAgIGlmIChjb25kaXRpb24pIHtcbiAgICAgIHRoaXMud3JpdGVMaW5lKGdldFN0cmluZ0Zyb21TdHJPckZ1bmMoc3RyT3JGdW5jKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgbGluZSBvZiB0ZXh0LlxuICAgKiBAcGFyYW0gdGV4dCAtIFN0cmluZyB0byB3cml0ZS5cbiAgICovXG4gIHdyaXRlTGluZSh0ZXh0OiBzdHJpbmcpOiB0aGlzIHtcbiAgICB0aGlzLl9uZXdMaW5lSWZOZXdMaW5lT25OZXh0V3JpdGUoKTtcbiAgICBpZiAodGhpcy5nZXRMYXN0Q2hhcigpICE9IG51bGwpIHtcbiAgICAgIHRoaXMubmV3TGluZUlmTGFzdE5vdCgpO1xuICAgIH1cbiAgICB0aGlzLl93cml0ZUluZGVudGluZ05ld0xpbmVzKHRleHQpO1xuICAgIHRoaXMubmV3TGluZSgpO1xuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgbmV3bGluZSBpZiB0aGUgbGFzdCBsaW5lIHdhcyBub3QgYSBuZXdsaW5lLlxuICAgKi9cbiAgbmV3TGluZUlmTGFzdE5vdCgpOiB0aGlzIHtcbiAgICB0aGlzLl9uZXdMaW5lSWZOZXdMaW5lT25OZXh0V3JpdGUoKTtcblxuICAgIGlmICghdGhpcy5pc0xhc3ROZXdMaW5lKCkpIHtcbiAgICAgIHRoaXMubmV3TGluZSgpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhIGJsYW5rIGxpbmUgaWYgdGhlIGxhc3Qgd3JpdHRlbiB0ZXh0IHdhcyBub3QgYSBibGFuayBsaW5lLlxuICAgKi9cbiAgYmxhbmtMaW5lSWZMYXN0Tm90KCk6IHRoaXMge1xuICAgIGlmICghdGhpcy5pc0xhc3RCbGFua0xpbmUoKSkge1xuICAgICAgdGhpcy5ibGFua0xpbmUoKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgYmxhbmsgbGluZSBpZiB0aGUgY29uZGl0aW9uIGlzIHRydWUuXG4gICAqIEBwYXJhbSBjb25kaXRpb24gLSBDb25kaXRpb24gdG8gZXZhbHVhdGUuXG4gICAqL1xuICBjb25kaXRpb25hbEJsYW5rTGluZShjb25kaXRpb246IGJvb2xlYW4gfCB1bmRlZmluZWQpOiB0aGlzIHtcbiAgICBpZiAoY29uZGl0aW9uKSB7XG4gICAgICB0aGlzLmJsYW5rTGluZSgpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYSBibGFuayBsaW5lLlxuICAgKi9cbiAgYmxhbmtMaW5lKCk6IHRoaXMge1xuICAgIHJldHVybiB0aGlzLm5ld0xpbmVJZkxhc3ROb3QoKS5uZXdMaW5lKCk7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgbmV3bGluZSBpZiB0aGUgY29uZGl0aW9uIGlzIHRydWUuXG4gICAqIEBwYXJhbSBjb25kaXRpb24gLSBDb25kaXRpb24gdG8gZXZhbHVhdGUuXG4gICAqL1xuICBjb25kaXRpb25hbE5ld0xpbmUoY29uZGl0aW9uOiBib29sZWFuIHwgdW5kZWZpbmVkKTogdGhpcyB7XG4gICAgaWYgKGNvbmRpdGlvbikge1xuICAgICAgdGhpcy5uZXdMaW5lKCk7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFdyaXRlcyBhIG5ld2xpbmUuXG4gICAqL1xuICBuZXdMaW5lKCk6IHRoaXMge1xuICAgIHRoaXMuX25ld0xpbmVPbk5leHRXcml0ZSA9IGZhbHNlO1xuICAgIHRoaXMuX2Jhc2VXcml0ZU5ld2xpbmUoKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYSBxdW90ZSBjaGFyYWN0ZXIuXG4gICAqL1xuICBxdW90ZSgpOiB0aGlzO1xuICAvKipcbiAgICogV3JpdGVzIHRleHQgc3Vycm91bmRlZCBpbiBxdW90ZXMuXG4gICAqIEBwYXJhbSB0ZXh0IC0gVGV4dCB0byB3cml0ZS5cbiAgICovXG4gIHF1b3RlKHRleHQ6IHN0cmluZyk6IHRoaXM7XG4gIHF1b3RlKHRleHQ/OiBzdHJpbmcpIHtcbiAgICB0aGlzLl9uZXdMaW5lSWZOZXdMaW5lT25OZXh0V3JpdGUoKTtcbiAgICB0aGlzLl93cml0ZUluZGVudGluZ05ld0xpbmVzKHRleHQgPT0gbnVsbCA/IHRoaXMuX3F1b3RlQ2hhciA6IHRoaXMuX3F1b3RlQ2hhciArIGVzY2FwZUZvcldpdGhpblN0cmluZyh0ZXh0LCB0aGlzLl9xdW90ZUNoYXIpICsgdGhpcy5fcXVvdGVDaGFyKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYSBzcGFjZSBpZiB0aGUgbGFzdCBjaGFyYWN0ZXIgd2FzIG5vdCBhIHNwYWNlLlxuICAgKi9cbiAgc3BhY2VJZkxhc3ROb3QoKTogdGhpcyB7XG4gICAgdGhpcy5fbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCk7XG5cbiAgICBpZiAoIXRoaXMuaXNMYXN0U3BhY2UoKSkge1xuICAgICAgdGhpcy5fd3JpdGVJbmRlbnRpbmdOZXdMaW5lcyhcIiBcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgc3BhY2UuXG4gICAqIEBwYXJhbSB0aW1lcyAtIE51bWJlciBvZiB0aW1lcyB0byB3cml0ZSBhIHNwYWNlLlxuICAgKi9cbiAgc3BhY2UodGltZXMgPSAxKTogdGhpcyB7XG4gICAgdGhpcy5fbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCk7XG4gICAgdGhpcy5fd3JpdGVJbmRlbnRpbmdOZXdMaW5lcyhcIiBcIi5yZXBlYXQodGltZXMpKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgYSB0YWIgaWYgdGhlIGxhc3QgY2hhcmFjdGVyIHdhcyBub3QgYSB0YWIuXG4gICAqL1xuICB0YWJJZkxhc3ROb3QoKTogdGhpcyB7XG4gICAgdGhpcy5fbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCk7XG5cbiAgICBpZiAoIXRoaXMuaXNMYXN0VGFiKCkpIHtcbiAgICAgIHRoaXMuX3dyaXRlSW5kZW50aW5nTmV3TGluZXMoXCJcXHRcIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIGEgdGFiLlxuICAgKiBAcGFyYW0gdGltZXMgLSBOdW1iZXIgb2YgdGltZXMgdG8gd3JpdGUgYSB0YWIuXG4gICAqL1xuICB0YWIodGltZXMgPSAxKTogdGhpcyB7XG4gICAgdGhpcy5fbmV3TGluZUlmTmV3TGluZU9uTmV4dFdyaXRlKCk7XG4gICAgdGhpcy5fd3JpdGVJbmRlbnRpbmdOZXdMaW5lcyhcIlxcdFwiLnJlcGVhdCh0aW1lcykpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIENvbmRpdGlvbmFsbHkgd3JpdGVzIHRleHQuXG4gICAqIEBwYXJhbSBjb25kaXRpb24gLSBDb25kaXRpb24gdG8gZXZhbHVhdGUuXG4gICAqIEBwYXJhbSB0ZXh0RnVuYyAtIEEgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgc3RyaW5nIHRvIHdyaXRlIGlmIHRoZSBjb25kaXRpb24gaXMgdHJ1ZS5cbiAgICovXG4gIGNvbmRpdGlvbmFsV3JpdGUoY29uZGl0aW9uOiBib29sZWFuIHwgdW5kZWZpbmVkLCB0ZXh0RnVuYzogKCkgPT4gc3RyaW5nKTogdGhpcztcbiAgLyoqXG4gICAqIENvbmRpdGlvbmFsbHkgd3JpdGVzIHRleHQuXG4gICAqIEBwYXJhbSBjb25kaXRpb24gLSBDb25kaXRpb24gdG8gZXZhbHVhdGUuXG4gICAqIEBwYXJhbSB0ZXh0IC0gVGV4dCB0byB3cml0ZSBpZiB0aGUgY29uZGl0aW9uIGlzIHRydWUuXG4gICAqL1xuICBjb25kaXRpb25hbFdyaXRlKGNvbmRpdGlvbjogYm9vbGVhbiB8IHVuZGVmaW5lZCwgdGV4dDogc3RyaW5nKTogdGhpcztcbiAgY29uZGl0aW9uYWxXcml0ZShjb25kaXRpb246IGJvb2xlYW4gfCB1bmRlZmluZWQsIHRleHRPckZ1bmM6IHN0cmluZyB8ICgoKSA9PiBzdHJpbmcpKSB7XG4gICAgaWYgKGNvbmRpdGlvbikge1xuICAgICAgdGhpcy53cml0ZShnZXRTdHJpbmdGcm9tU3RyT3JGdW5jKHRleHRPckZ1bmMpKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBXcml0ZXMgdGhlIHByb3ZpZGVkIHRleHQuXG4gICAqIEBwYXJhbSB0ZXh0IC0gVGV4dCB0byB3cml0ZS5cbiAgICovXG4gIHdyaXRlKHRleHQ6IHN0cmluZyk6IHRoaXMge1xuICAgIHRoaXMuX25ld0xpbmVJZk5ld0xpbmVPbk5leHRXcml0ZSgpO1xuICAgIHRoaXMuX3dyaXRlSW5kZW50aW5nTmV3TGluZXModGV4dCk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogV3JpdGVzIHRleHQgdG8gZXhpdCBhIGNvbW1lbnQgaWYgaW4gYSBjb21tZW50LlxuICAgKi9cbiAgY2xvc2VDb21tZW50KCk6IHRoaXMge1xuICAgIGNvbnN0IGNvbW1lbnRDaGFyID0gdGhpcy5fY3VycmVudENvbW1lbnRDaGFyO1xuXG4gICAgc3dpdGNoIChjb21tZW50Q2hhcikge1xuICAgICAgY2FzZSBDb21tZW50Q2hhci5MaW5lOlxuICAgICAgICB0aGlzLm5ld0xpbmUoKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIENvbW1lbnRDaGFyLlN0YXI6XG4gICAgICAgIGlmICghdGhpcy5pc0xhc3ROZXdMaW5lKCkpIHtcbiAgICAgICAgICB0aGlzLnNwYWNlSWZMYXN0Tm90KCk7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy53cml0ZShcIiovXCIpO1xuICAgICAgICBicmVhaztcbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc3QgX2Fzc2VydFVuZGVmaW5lZDogdW5kZWZpbmVkID0gY29tbWVudENoYXI7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIEluc2VydHMgdGV4dCBhdCB0aGUgcHJvdmlkZWQgcG9zaXRpb24uXG4gICAqXG4gICAqIFRoaXMgbWV0aG9kIGlzIFwidW5zYWZlXCIgYmVjYXVzZSBpdCB3b24ndCB1cGRhdGUgdGhlIHN0YXRlIG9mIHRoZSB3cml0ZXIgdW5sZXNzXG4gICAqIGluc2VydGluZyBhdCB0aGUgZW5kIHBvc2l0aW9uLiBJdCBpcyBiaWFzZWQgdG93YXJkcyBiZWluZyBmYXN0IGF0IGluc2VydGluZyBjbG9zZXJcbiAgICogdG8gdGhlIHN0YXJ0IG9yIGVuZCwgYnV0IHNsb3dlciB0byBpbnNlcnQgaW4gdGhlIG1pZGRsZS4gT25seSB1c2UgdGhpcyBpZlxuICAgKiBhYnNvbHV0ZWx5IG5lY2Vzc2FyeS5cbiAgICogQHBhcmFtIHBvcyAtIFBvc2l0aW9uIHRvIGluc2VydCBhdC5cbiAgICogQHBhcmFtIHRleHQgLSBUZXh0IHRvIGluc2VydC5cbiAgICovXG4gIHVuc2FmZUluc2VydChwb3M6IG51bWJlciwgdGV4dDogc3RyaW5nKTogdGhpcyB7XG4gICAgY29uc3QgdGV4dExlbmd0aCA9IHRoaXMuX2xlbmd0aDtcbiAgICBjb25zdCB0ZXh0cyA9IHRoaXMuX3RleHRzO1xuICAgIHZlcmlmeUlucHV0KCk7XG5cbiAgICBpZiAocG9zID09PSB0ZXh0TGVuZ3RoKSB7XG4gICAgICByZXR1cm4gdGhpcy53cml0ZSh0ZXh0KTtcbiAgICB9XG5cbiAgICB1cGRhdGVJbnRlcm5hbEFycmF5KCk7XG4gICAgdGhpcy5fbGVuZ3RoICs9IHRleHQubGVuZ3RoO1xuXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgICBmdW5jdGlvbiB2ZXJpZnlJbnB1dCgpIHtcbiAgICAgIGlmIChwb3MgPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUHJvdmlkZWQgcG9zaXRpb24gb2YgJyR7cG9zfScgd2FzIGxlc3MgdGhhbiB6ZXJvLmApO1xuICAgICAgfVxuICAgICAgaWYgKHBvcyA+IHRleHRMZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcm92aWRlZCBwb3NpdGlvbiBvZiAnJHtwb3N9JyB3YXMgZ3JlYXRlciB0aGFuIHRoZSB0ZXh0IGxlbmd0aCBvZiAnJHt0ZXh0TGVuZ3RofScuYCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdXBkYXRlSW50ZXJuYWxBcnJheSgpIHtcbiAgICAgIGNvbnN0IHsgaW5kZXgsIGxvY2FsSW5kZXggfSA9IGdldEFycmF5SW5kZXhBbmRMb2NhbEluZGV4KCk7XG5cbiAgICAgIGlmIChsb2NhbEluZGV4ID09PSAwKSB7XG4gICAgICAgIHRleHRzLnNwbGljZShpbmRleCwgMCwgdGV4dCk7XG4gICAgICB9IGVsc2UgaWYgKGxvY2FsSW5kZXggPT09IHRleHRzW2luZGV4XS5sZW5ndGgpIHtcbiAgICAgICAgdGV4dHMuc3BsaWNlKGluZGV4ICsgMSwgMCwgdGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB0ZXh0SXRlbSA9IHRleHRzW2luZGV4XTtcbiAgICAgICAgY29uc3Qgc3RhcnRUZXh0ID0gdGV4dEl0ZW0uc3Vic3RyaW5nKDAsIGxvY2FsSW5kZXgpO1xuICAgICAgICBjb25zdCBlbmRUZXh0ID0gdGV4dEl0ZW0uc3Vic3RyaW5nKGxvY2FsSW5kZXgpO1xuICAgICAgICB0ZXh0cy5zcGxpY2UoaW5kZXgsIDEsIHN0YXJ0VGV4dCwgdGV4dCwgZW5kVGV4dCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0QXJyYXlJbmRleEFuZExvY2FsSW5kZXgoKSB7XG4gICAgICBpZiAocG9zIDwgdGV4dExlbmd0aCAvIDIpIHtcbiAgICAgICAgLy8gc3RhcnQgc2VhcmNoaW5nIGZyb20gdGhlIGZyb250XG4gICAgICAgIGxldCBlbmRQb3MgPSAwO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRleHRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgdGV4dEl0ZW0gPSB0ZXh0c1tpXTtcbiAgICAgICAgICBjb25zdCBzdGFydFBvcyA9IGVuZFBvcztcbiAgICAgICAgICBlbmRQb3MgKz0gdGV4dEl0ZW0ubGVuZ3RoO1xuICAgICAgICAgIGlmIChlbmRQb3MgPj0gcG9zKSB7XG4gICAgICAgICAgICByZXR1cm4geyBpbmRleDogaSwgbG9jYWxJbmRleDogcG9zIC0gc3RhcnRQb3MgfTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHN0YXJ0IHNlYXJjaGluZyBmcm9tIHRoZSBiYWNrXG4gICAgICAgIGxldCBzdGFydFBvcyA9IHRleHRMZW5ndGg7XG4gICAgICAgIGZvciAobGV0IGkgPSB0ZXh0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgIGNvbnN0IHRleHRJdGVtID0gdGV4dHNbaV07XG4gICAgICAgICAgc3RhcnRQb3MgLT0gdGV4dEl0ZW0ubGVuZ3RoO1xuICAgICAgICAgIGlmIChzdGFydFBvcyA8PSBwb3MpIHtcbiAgICAgICAgICAgIHJldHVybiB7IGluZGV4OiBpLCBsb2NhbEluZGV4OiBwb3MgLSBzdGFydFBvcyB9O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJVbmhhbmRsZWQgc2l0dWF0aW9uIGluc2VydGluZy4gVGhpcyBzaG91bGQgbmV2ZXIgaGFwcGVuLlwiKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgbGVuZ3RoIG9mIHRoZSBzdHJpbmcgaW4gdGhlIHdyaXRlci5cbiAgICovXG4gIGdldExlbmd0aCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9sZW5ndGg7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBpZiB0aGUgd3JpdGVyIGlzIGN1cnJlbnRseSBpbiBhIGNvbW1lbnQuXG4gICAqL1xuICBpc0luQ29tbWVudCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fY3VycmVudENvbW1lbnRDaGFyICE9PSB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBpZiB0aGUgd3JpdGVyIGlzIGN1cnJlbnRseSBhdCB0aGUgc3RhcnQgb2YgdGhlIGZpcnN0IGxpbmUgb2YgdGhlIHRleHQsIGJsb2NrLCBvciBpbmRlbnRhdGlvbiBibG9jay5cbiAgICovXG4gIGlzQXRTdGFydE9mRmlyc3RMaW5lT2ZCbG9jaygpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5pc09uRmlyc3RMaW5lT2ZCbG9jaygpICYmICh0aGlzLmlzTGFzdE5ld0xpbmUoKSB8fCB0aGlzLmdldExhc3RDaGFyKCkgPT0gbnVsbCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBpZiB0aGUgd3JpdGVyIGlzIGN1cnJlbnRseSBvbiB0aGUgZmlyc3QgbGluZSBvZiB0aGUgdGV4dCwgYmxvY2ssIG9yIGluZGVudGF0aW9uIGJsb2NrLlxuICAgKi9cbiAgaXNPbkZpcnN0TGluZU9mQmxvY2soKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2lzT25GaXJzdExpbmVPZkJsb2NrO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgaWYgdGhlIHdyaXRlciBpcyBjdXJyZW50bHkgaW4gYSBzdHJpbmcuXG4gICAqL1xuICBpc0luU3RyaW5nKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9zdHJpbmdDaGFyU3RhY2subGVuZ3RoID4gMCAmJiB0aGlzLl9zdHJpbmdDaGFyU3RhY2tbdGhpcy5fc3RyaW5nQ2hhclN0YWNrLmxlbmd0aCAtIDFdICE9PSBDSEFSUy5PUEVOX0JSQUNFO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgaWYgdGhlIGxhc3QgY2hhcnMgd3JpdHRlbiB3ZXJlIGZvciBhIG5ld2xpbmUuXG4gICAqL1xuICBpc0xhc3ROZXdMaW5lKCk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGxhc3RDaGFyID0gdGhpcy5nZXRMYXN0Q2hhcigpO1xuICAgIHJldHVybiBsYXN0Q2hhciA9PT0gXCJcXG5cIiB8fCBsYXN0Q2hhciA9PT0gXCJcXHJcIjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXRzIGlmIHRoZSBsYXN0IGNoYXJzIHdyaXR0ZW4gd2VyZSBmb3IgYSBibGFuayBsaW5lLlxuICAgKi9cbiAgaXNMYXN0QmxhbmtMaW5lKCk6IGJvb2xlYW4ge1xuICAgIGxldCBmb3VuZENvdW50ID0gMDtcblxuICAgIC8vIHRvZG86IGNvbnNpZGVyIGV4dHJhY3Rpbmcgb3V0IGl0ZXJhdGluZyBvdmVyIHBhc3QgY2hhcmFjdGVycywgYnV0IGRvbid0IHVzZVxuICAgIC8vIGFuIGl0ZXJhdG9yIGJlY2F1c2UgaXQgd2lsbCBiZSBzbG93LlxuICAgIGZvciAobGV0IGkgPSB0aGlzLl90ZXh0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3QgY3VycmVudFRleHQgPSB0aGlzLl90ZXh0c1tpXTtcbiAgICAgIGZvciAobGV0IGogPSBjdXJyZW50VGV4dC5sZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgICBjb25zdCBjdXJyZW50Q2hhciA9IGN1cnJlbnRUZXh0LmNoYXJDb2RlQXQoaik7XG4gICAgICAgIGlmIChjdXJyZW50Q2hhciA9PT0gQ0hBUlMuTkVXX0xJTkUpIHtcbiAgICAgICAgICBmb3VuZENvdW50Kys7XG4gICAgICAgICAgaWYgKGZvdW5kQ291bnQgPT09IDIpIHtcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50Q2hhciAhPT0gQ0hBUlMuQ0FSUklBR0VfUkVUVVJOKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgaWYgdGhlIGxhc3QgY2hhciB3cml0dGVuIHdhcyBhIHNwYWNlLlxuICAgKi9cbiAgaXNMYXN0U3BhY2UoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0TGFzdENoYXIoKSA9PT0gXCIgXCI7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyBpZiB0aGUgbGFzdCBjaGFyIHdyaXR0ZW4gd2FzIGEgdGFiLlxuICAgKi9cbiAgaXNMYXN0VGFiKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLmdldExhc3RDaGFyKCkgPT09IFwiXFx0XCI7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgbGFzdCBjaGFyIHdyaXR0ZW4uXG4gICAqL1xuICBnZXRMYXN0Q2hhcigpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xuICAgIGNvbnN0IGNoYXJDb2RlID0gdGhpcy5fZ2V0TGFzdENoYXJDb2RlV2l0aE9mZnNldCgwKTtcbiAgICByZXR1cm4gY2hhckNvZGUgPT0gbnVsbCA/IHVuZGVmaW5lZCA6IFN0cmluZy5mcm9tQ2hhckNvZGUoY2hhckNvZGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldHMgaWYgdGhlIHdyaXRlciBlbmRzIHdpdGggdGhlIHByb3ZpZGVkIHRleHQuXG4gICAqIEBwYXJhbSB0ZXh0IC0gVGV4dCB0byBjaGVjayBpZiB0aGUgd3JpdGVyIGVuZHMgd2l0aCB0aGUgcHJvdmlkZWQgdGV4dC5cbiAgICovXG4gIGVuZHNXaXRoKHRleHQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGxlbmd0aCA9IHRoaXMuX2xlbmd0aDtcbiAgICByZXR1cm4gdGhpcy5pdGVyYXRlTGFzdENoYXJDb2RlcygoY2hhckNvZGUsIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCBvZmZzZXQgPSBsZW5ndGggLSBpbmRleDtcbiAgICAgIGNvbnN0IHRleHRJbmRleCA9IHRleHQubGVuZ3RoIC0gb2Zmc2V0O1xuICAgICAgaWYgKHRleHQuY2hhckNvZGVBdCh0ZXh0SW5kZXgpICE9PSBjaGFyQ29kZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGV4dEluZGV4ID09PSAwID8gdHJ1ZSA6IHVuZGVmaW5lZDtcbiAgICB9KSB8fCBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBJdGVyYXRlcyBvdmVyIHRoZSB3cml0ZXIgY2hhcmFjdGVycyBpbiByZXZlcnNlIG9yZGVyLiBUaGUgaXRlcmF0aW9uIHN0b3BzIHdoZW4gYSBub24tbnVsbCBvclxuICAgKiB1bmRlZmluZWQgdmFsdWUgaXMgcmV0dXJuZWQgZnJvbSB0aGUgYWN0aW9uLiBUaGUgcmV0dXJuZWQgdmFsdWUgaXMgdGhlbiByZXR1cm5lZCBieSB0aGUgbWV0aG9kLlxuICAgKlxuICAgKiBAcmVtYXJrcyBJdCBpcyBtdWNoIG1vcmUgZWZmaWNpZW50IHRvIHVzZSB0aGlzIG1ldGhvZCByYXRoZXIgdGhhbiBgI3RvU3RyaW5nKClgIHNpbmNlIGAjdG9TdHJpbmcoKWBcbiAgICogd2lsbCBjb21iaW5lIHRoZSBpbnRlcm5hbCBhcnJheSBpbnRvIGEgc3RyaW5nLlxuICAgKi9cbiAgaXRlcmF0ZUxhc3RDaGFyczxUPihhY3Rpb246IChjaGFyOiBzdHJpbmcsIGluZGV4OiBudW1iZXIpID0+IFQgfCB1bmRlZmluZWQpOiBUIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5pdGVyYXRlTGFzdENoYXJDb2RlcygoY2hhckNvZGUsIGluZGV4KSA9PiBhY3Rpb24oU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyQ29kZSksIGluZGV4KSk7XG4gIH1cblxuICAvKipcbiAgICogSXRlcmF0ZXMgb3ZlciB0aGUgd3JpdGVyIGNoYXJhY3RlciBjaGFyIGNvZGVzIGluIHJldmVyc2Ugb3JkZXIuIFRoZSBpdGVyYXRpb24gc3RvcHMgd2hlbiBhIG5vbi1udWxsIG9yXG4gICAqIHVuZGVmaW5lZCB2YWx1ZSBpcyByZXR1cm5lZCBmcm9tIHRoZSBhY3Rpb24uIFRoZSByZXR1cm5lZCB2YWx1ZSBpcyB0aGVuIHJldHVybmVkIGJ5IHRoZSBtZXRob2QuXG4gICAqXG4gICAqIEByZW1hcmtzIEl0IGlzIG11Y2ggbW9yZSBlZmZpY2llbnQgdG8gdXNlIHRoaXMgbWV0aG9kIHJhdGhlciB0aGFuIGAjdG9TdHJpbmcoKWAgc2luY2UgYCN0b1N0cmluZygpYFxuICAgKiB3aWxsIGNvbWJpbmUgdGhlIGludGVybmFsIGFycmF5IGludG8gYSBzdHJpbmcuIEFkZGl0aW9uYWxseSwgdGhpcyBpcyBzbGlnaHRseSBtb3JlIGVmZmljaWVudCB0aGF0XG4gICAqIGBpdGVyYXRlTGFzdENoYXJzYCBhcyB0aGlzIHdvbid0IGFsbG9jYXRlIGEgc3RyaW5nIHBlciBjaGFyYWN0ZXIuXG4gICAqL1xuICBpdGVyYXRlTGFzdENoYXJDb2RlczxUPihhY3Rpb246IChjaGFyQ29kZTogbnVtYmVyLCBpbmRleDogbnVtYmVyKSA9PiBUIHwgdW5kZWZpbmVkKTogVCB8IHVuZGVmaW5lZCB7XG4gICAgbGV0IGluZGV4ID0gdGhpcy5fbGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSB0aGlzLl90ZXh0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3QgY3VycmVudFRleHQgPSB0aGlzLl90ZXh0c1tpXTtcbiAgICAgIGZvciAobGV0IGogPSBjdXJyZW50VGV4dC5sZW5ndGggLSAxOyBqID49IDA7IGotLSkge1xuICAgICAgICBpbmRleC0tO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhY3Rpb24oY3VycmVudFRleHQuY2hhckNvZGVBdChqKSwgaW5kZXgpO1xuICAgICAgICBpZiAocmVzdWx0ICE9IG51bGwpIHtcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0cyB0aGUgd3JpdGVyJ3MgdGV4dC5cbiAgICovXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgaWYgKHRoaXMuX3RleHRzLmxlbmd0aCA+IDEpIHtcbiAgICAgIGNvbnN0IHRleHQgPSB0aGlzLl90ZXh0cy5qb2luKFwiXCIpO1xuICAgICAgdGhpcy5fdGV4dHMubGVuZ3RoID0gMDtcbiAgICAgIHRoaXMuX3RleHRzLnB1c2godGV4dCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuX3RleHRzWzBdIHx8IFwiXCI7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IF9uZXdMaW5lUmVnRXggPSAvXFxyP1xcbi87XG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfd3JpdGVJbmRlbnRpbmdOZXdMaW5lcyh0ZXh0OiBzdHJpbmcpIHtcbiAgICB0ZXh0ID0gdGV4dCB8fCBcIlwiO1xuICAgIGlmICh0ZXh0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgd3JpdGVJbmRpdmlkdWFsKHRoaXMsIFwiXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGl0ZW1zID0gdGV4dC5zcGxpdChDb2RlQmxvY2tXcml0ZXIuX25ld0xpbmVSZWdFeCk7XG4gICAgaXRlbXMuZm9yRWFjaCgocywgaSkgPT4ge1xuICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgIHRoaXMuX2Jhc2VXcml0ZU5ld2xpbmUoKTtcbiAgICAgIH1cblxuICAgICAgaWYgKHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgd3JpdGVJbmRpdmlkdWFsKHRoaXMsIHMpO1xuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gd3JpdGVJbmRpdmlkdWFsKHdyaXRlcjogQ29kZUJsb2NrV3JpdGVyLCBzOiBzdHJpbmcpIHtcbiAgICAgIGlmICghd3JpdGVyLmlzSW5TdHJpbmcoKSkge1xuICAgICAgICBjb25zdCBpc0F0U3RhcnRPZkxpbmUgPSB3cml0ZXIuaXNMYXN0TmV3TGluZSgpIHx8IHdyaXRlci5nZXRMYXN0Q2hhcigpID09IG51bGw7XG4gICAgICAgIGlmIChpc0F0U3RhcnRPZkxpbmUpIHtcbiAgICAgICAgICB3cml0ZXIuX3dyaXRlSW5kZW50YXRpb24oKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICB3cml0ZXIuX3VwZGF0ZUludGVybmFsU3RhdGUocyk7XG4gICAgICB3cml0ZXIuX2ludGVybmFsV3JpdGUocyk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9iYXNlV3JpdGVOZXdsaW5lKCkge1xuICAgIGlmICh0aGlzLl9jdXJyZW50Q29tbWVudENoYXIgPT09IENvbW1lbnRDaGFyLkxpbmUpIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRDb21tZW50Q2hhciA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBjb25zdCBsYXN0U3RyaW5nQ2hhck9uU3RhY2sgPSB0aGlzLl9zdHJpbmdDaGFyU3RhY2tbdGhpcy5fc3RyaW5nQ2hhclN0YWNrLmxlbmd0aCAtIDFdO1xuICAgIGlmICgobGFzdFN0cmluZ0NoYXJPblN0YWNrID09PSBDSEFSUy5ET1VCTEVfUVVPVEUgfHwgbGFzdFN0cmluZ0NoYXJPblN0YWNrID09PSBDSEFSUy5TSU5HTEVfUVVPVEUpICYmIHRoaXMuX2dldExhc3RDaGFyQ29kZVdpdGhPZmZzZXQoMCkgIT09IENIQVJTLkJBQ0tfU0xBU0gpIHtcbiAgICAgIHRoaXMuX3N0cmluZ0NoYXJTdGFjay5wb3AoKTtcbiAgICB9XG5cbiAgICB0aGlzLl9pbnRlcm5hbFdyaXRlKHRoaXMuX25ld0xpbmUpO1xuICAgIHRoaXMuX2lzT25GaXJzdExpbmVPZkJsb2NrID0gZmFsc2U7XG4gICAgdGhpcy5fZGVxdWV1ZVF1ZXVlZEluZGVudGF0aW9uKCk7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX2RlcXVldWVRdWV1ZWRJbmRlbnRhdGlvbigpIHtcbiAgICBpZiAodGhpcy5fcXVldWVkSW5kZW50YXRpb24gPT0gbnVsbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9xdWV1ZWRPbmx5SWZOb3RCbG9jayAmJiB3YXNMYXN0QmxvY2sodGhpcykpIHtcbiAgICAgIHRoaXMuX3F1ZXVlZEluZGVudGF0aW9uID0gdW5kZWZpbmVkO1xuICAgICAgdGhpcy5fcXVldWVkT25seUlmTm90QmxvY2sgPSB1bmRlZmluZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX2N1cnJlbnRJbmRlbnRhdGlvbiA9IHRoaXMuX3F1ZXVlZEluZGVudGF0aW9uO1xuICAgICAgdGhpcy5fcXVldWVkSW5kZW50YXRpb24gPSB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gd2FzTGFzdEJsb2NrKHdyaXRlcjogQ29kZUJsb2NrV3JpdGVyKSB7XG4gICAgICBsZXQgZm91bmROZXdMaW5lID0gZmFsc2U7XG4gICAgICByZXR1cm4gd3JpdGVyLml0ZXJhdGVMYXN0Q2hhckNvZGVzKGNoYXJDb2RlID0+IHtcbiAgICAgICAgc3dpdGNoIChjaGFyQ29kZSkge1xuICAgICAgICAgIGNhc2UgQ0hBUlMuTkVXX0xJTkU6XG4gICAgICAgICAgICBpZiAoZm91bmROZXdMaW5lKSB7XG4gICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZvdW5kTmV3TGluZSA9IHRydWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlIENIQVJTLkNBUlJJQUdFX1JFVFVSTjpcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgICAgY2FzZSBDSEFSUy5PUEVOX0JSQUNFOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF91cGRhdGVJbnRlcm5hbFN0YXRlKHN0cjogc3RyaW5nKSB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IGN1cnJlbnRDaGFyID0gc3RyLmNoYXJDb2RlQXQoaSk7XG5cbiAgICAgIC8vIFRoaXMgaXMgYSBwZXJmb3JtYW5jZSBvcHRpbWl6YXRpb24gdG8gc2hvcnQgY2lyY3VpdCBhbGwgdGhlIGNoZWNrcyBiZWxvdy4gSWYgdGhlIGN1cnJlbnQgY2hhclxuICAgICAgLy8gaXMgbm90IGluIHRoaXMgc2V0IHRoZW4gaXQgd29uJ3QgY2hhbmdlIGFueSBpbnRlcm5hbCBzdGF0ZSBzbyBubyBuZWVkIHRvIGNvbnRpbnVlIGFuZCBkb1xuICAgICAgLy8gc28gbWFueSBvdGhlciBjaGVja3MgKHRoaXMgbWFkZSBpdCAzeCBmYXN0ZXIgaW4gb25lIHNjZW5hcmlvIEkgdGVzdGVkKS5cbiAgICAgIGlmICghaXNDaGFyVG9IYW5kbGUuaGFzKGN1cnJlbnRDaGFyKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgcGFzdENoYXIgPSBpID09PSAwID8gdGhpcy5fZ2V0TGFzdENoYXJDb2RlV2l0aE9mZnNldCgwKSA6IHN0ci5jaGFyQ29kZUF0KGkgLSAxKTtcbiAgICAgIGNvbnN0IHBhc3RQYXN0Q2hhciA9IGkgPT09IDAgPyB0aGlzLl9nZXRMYXN0Q2hhckNvZGVXaXRoT2Zmc2V0KDEpIDogaSA9PT0gMSA/IHRoaXMuX2dldExhc3RDaGFyQ29kZVdpdGhPZmZzZXQoMCkgOiBzdHIuY2hhckNvZGVBdChpIC0gMik7XG5cbiAgICAgIC8vIGhhbmRsZSByZWdleFxuICAgICAgaWYgKHRoaXMuX2lzSW5SZWdFeCkge1xuICAgICAgICBpZiAocGFzdENoYXIgPT09IENIQVJTLkZPUldBUkRfU0xBU0ggJiYgcGFzdFBhc3RDaGFyICE9PSBDSEFSUy5CQUNLX1NMQVNIIHx8IHBhc3RDaGFyID09PSBDSEFSUy5ORVdfTElORSkge1xuICAgICAgICAgIHRoaXMuX2lzSW5SZWdFeCA9IGZhbHNlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKCF0aGlzLmlzSW5TdHJpbmcoKSAmJiAhdGhpcy5pc0luQ29tbWVudCgpICYmIGlzUmVnRXhTdGFydChjdXJyZW50Q2hhciwgcGFzdENoYXIsIHBhc3RQYXN0Q2hhcikpIHtcbiAgICAgICAgdGhpcy5faXNJblJlZ0V4ID0gdHJ1ZTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIGhhbmRsZSBjb21tZW50c1xuICAgICAgaWYgKHRoaXMuX2N1cnJlbnRDb21tZW50Q2hhciA9PSBudWxsICYmIHBhc3RDaGFyID09PSBDSEFSUy5GT1JXQVJEX1NMQVNIICYmIGN1cnJlbnRDaGFyID09PSBDSEFSUy5GT1JXQVJEX1NMQVNIKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRDb21tZW50Q2hhciA9IENvbW1lbnRDaGFyLkxpbmU7XG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2N1cnJlbnRDb21tZW50Q2hhciA9PSBudWxsICYmIHBhc3RDaGFyID09PSBDSEFSUy5GT1JXQVJEX1NMQVNIICYmIGN1cnJlbnRDaGFyID09PSBDSEFSUy5BU1RFUklTSykge1xuICAgICAgICB0aGlzLl9jdXJyZW50Q29tbWVudENoYXIgPSBDb21tZW50Q2hhci5TdGFyO1xuICAgICAgfSBlbHNlIGlmICh0aGlzLl9jdXJyZW50Q29tbWVudENoYXIgPT09IENvbW1lbnRDaGFyLlN0YXIgJiYgcGFzdENoYXIgPT09IENIQVJTLkFTVEVSSVNLICYmIGN1cnJlbnRDaGFyID09PSBDSEFSUy5GT1JXQVJEX1NMQVNIKSB7XG4gICAgICAgIHRoaXMuX2N1cnJlbnRDb21tZW50Q2hhciA9IHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgaWYgKHRoaXMuaXNJbkNvbW1lbnQoKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgLy8gaGFuZGxlIHN0cmluZ3NcbiAgICAgIGNvbnN0IGxhc3RTdHJpbmdDaGFyT25TdGFjayA9IHRoaXMuX3N0cmluZ0NoYXJTdGFjay5sZW5ndGggPT09IDAgPyB1bmRlZmluZWQgOiB0aGlzLl9zdHJpbmdDaGFyU3RhY2tbdGhpcy5fc3RyaW5nQ2hhclN0YWNrLmxlbmd0aCAtIDFdO1xuICAgICAgaWYgKHBhc3RDaGFyICE9PSBDSEFSUy5CQUNLX1NMQVNIICYmIChjdXJyZW50Q2hhciA9PT0gQ0hBUlMuRE9VQkxFX1FVT1RFIHx8IGN1cnJlbnRDaGFyID09PSBDSEFSUy5TSU5HTEVfUVVPVEUgfHwgY3VycmVudENoYXIgPT09IENIQVJTLkJBQ0tfVElDSykpIHtcbiAgICAgICAgaWYgKGxhc3RTdHJpbmdDaGFyT25TdGFjayA9PT0gY3VycmVudENoYXIpIHtcbiAgICAgICAgICB0aGlzLl9zdHJpbmdDaGFyU3RhY2sucG9wKCk7XG4gICAgICAgIH0gZWxzZSBpZiAobGFzdFN0cmluZ0NoYXJPblN0YWNrID09PSBDSEFSUy5PUEVOX0JSQUNFIHx8IGxhc3RTdHJpbmdDaGFyT25TdGFjayA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhpcy5fc3RyaW5nQ2hhclN0YWNrLnB1c2goY3VycmVudENoYXIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHBhc3RQYXN0Q2hhciAhPT0gQ0hBUlMuQkFDS19TTEFTSCAmJiBwYXN0Q2hhciA9PT0gQ0hBUlMuRE9MTEFSX1NJR04gJiYgY3VycmVudENoYXIgPT09IENIQVJTLk9QRU5fQlJBQ0UgJiYgbGFzdFN0cmluZ0NoYXJPblN0YWNrID09PSBDSEFSUy5CQUNLX1RJQ0spIHtcbiAgICAgICAgdGhpcy5fc3RyaW5nQ2hhclN0YWNrLnB1c2goY3VycmVudENoYXIpO1xuICAgICAgfSBlbHNlIGlmIChjdXJyZW50Q2hhciA9PT0gQ0hBUlMuQ0xPU0VfQlJBQ0UgJiYgbGFzdFN0cmluZ0NoYXJPblN0YWNrID09PSBDSEFSUy5PUEVOX0JSQUNFKSB7XG4gICAgICAgIHRoaXMuX3N0cmluZ0NoYXJTdGFjay5wb3AoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKiogQGludGVybmFsIC0gVGhpcyBpcyBwcml2YXRlLCBidXQgZXhwb3NlZCBmb3IgdGVzdGluZy4gKi9cbiAgX2dldExhc3RDaGFyQ29kZVdpdGhPZmZzZXQob2Zmc2V0OiBudW1iZXIpIHtcbiAgICBpZiAob2Zmc2V0ID49IHRoaXMuX2xlbmd0aCB8fCBvZmZzZXQgPCAwKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGZvciAobGV0IGkgPSB0aGlzLl90ZXh0cy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgY29uc3QgY3VycmVudFRleHQgPSB0aGlzLl90ZXh0c1tpXTtcbiAgICAgIGlmIChvZmZzZXQgPj0gY3VycmVudFRleHQubGVuZ3RoKSB7XG4gICAgICAgIG9mZnNldCAtPSBjdXJyZW50VGV4dC5sZW5ndGg7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY3VycmVudFRleHQuY2hhckNvZGVBdChjdXJyZW50VGV4dC5sZW5ndGggLSAxIC0gb2Zmc2V0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfd3JpdGVJbmRlbnRhdGlvbigpIHtcbiAgICBjb25zdCBmbG9vcmVkSW5kZW50YXRpb24gPSBNYXRoLmZsb29yKHRoaXMuX2N1cnJlbnRJbmRlbnRhdGlvbik7XG4gICAgdGhpcy5faW50ZXJuYWxXcml0ZSh0aGlzLl9pbmRlbnRhdGlvblRleHQucmVwZWF0KGZsb29yZWRJbmRlbnRhdGlvbikpO1xuXG4gICAgY29uc3Qgb3ZlcmZsb3cgPSB0aGlzLl9jdXJyZW50SW5kZW50YXRpb24gLSBmbG9vcmVkSW5kZW50YXRpb247XG4gICAgaWYgKHRoaXMuX3VzZVRhYnMpIHtcbiAgICAgIGlmIChvdmVyZmxvdyA+IDAuNSkge1xuICAgICAgICB0aGlzLl9pbnRlcm5hbFdyaXRlKHRoaXMuX2luZGVudGF0aW9uVGV4dCk7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHBvcnRpb24gPSBNYXRoLnJvdW5kKHRoaXMuX2luZGVudGF0aW9uVGV4dC5sZW5ndGggKiBvdmVyZmxvdyk7XG5cbiAgICAgIC8vIGJ1aWxkIHVwIHRoZSBzdHJpbmcgZmlyc3QsIHRoZW4gYXBwZW5kIGl0IGZvciBwZXJmb3JtYW5jZSByZWFzb25zXG4gICAgICBsZXQgdGV4dCA9IFwiXCI7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBvcnRpb247IGkrKykge1xuICAgICAgICB0ZXh0ICs9IHRoaXMuX2luZGVudGF0aW9uVGV4dFtpXTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2ludGVybmFsV3JpdGUodGV4dCk7XG4gICAgfVxuICB9XG5cbiAgLyoqIEBpbnRlcm5hbCAqL1xuICBwcml2YXRlIF9uZXdMaW5lSWZOZXdMaW5lT25OZXh0V3JpdGUoKSB7XG4gICAgaWYgKCF0aGlzLl9uZXdMaW5lT25OZXh0V3JpdGUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fbmV3TGluZU9uTmV4dFdyaXRlID0gZmFsc2U7XG4gICAgdGhpcy5uZXdMaW5lKCk7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX2ludGVybmFsV3JpdGUodGV4dDogc3RyaW5nKSB7XG4gICAgaWYgKHRleHQubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5fdGV4dHMucHVzaCh0ZXh0KTtcbiAgICB0aGlzLl9sZW5ndGggKz0gdGV4dC5sZW5ndGg7XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgc3RhdGljIHJlYWRvbmx5IF9zcGFjZXNPclRhYnNSZWdFeCA9IC9eWyBcXHRdKiQvO1xuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX2dldEluZGVudGF0aW9uTGV2ZWxGcm9tQXJnKGNvdW50T3JUZXh0OiBzdHJpbmcgfCBudW1iZXIpIHtcbiAgICBpZiAodHlwZW9mIGNvdW50T3JUZXh0ID09PSBcIm51bWJlclwiKSB7XG4gICAgICBpZiAoY291bnRPclRleHQgPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBhc3NlZCBpbiBpbmRlbnRhdGlvbiBsZXZlbCBzaG91bGQgYmUgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvIDAuXCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIGNvdW50T3JUZXh0O1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvdW50T3JUZXh0ID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBpZiAoIUNvZGVCbG9ja1dyaXRlci5fc3BhY2VzT3JUYWJzUmVnRXgudGVzdChjb3VudE9yVGV4dCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUHJvdmlkZWQgc3RyaW5nIG11c3QgYmUgZW1wdHkgb3Igb25seSBjb250YWluIHNwYWNlcyBvciB0YWJzLlwiKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgeyBzcGFjZXNDb3VudCwgdGFic0NvdW50IH0gPSBnZXRTcGFjZXNBbmRUYWJzQ291bnQoY291bnRPclRleHQpO1xuICAgICAgcmV0dXJuIHRhYnNDb3VudCArIHNwYWNlc0NvdW50IC8gdGhpcy5faW5kZW50TnVtYmVyT2ZTcGFjZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkFyZ3VtZW50IHByb3ZpZGVkIG11c3QgYmUgYSBzdHJpbmcgb3IgbnVtYmVyLlwiKTtcbiAgICB9XG4gIH1cblxuICAvKiogQGludGVybmFsICovXG4gIHByaXZhdGUgX3NldEluZGVudGF0aW9uU3RhdGUoc3RhdGU6IEluZGVudGF0aW9uTGV2ZWxTdGF0ZSkge1xuICAgIHRoaXMuX2N1cnJlbnRJbmRlbnRhdGlvbiA9IHN0YXRlLmN1cnJlbnQ7XG4gICAgdGhpcy5fcXVldWVkSW5kZW50YXRpb24gPSBzdGF0ZS5xdWV1ZWQ7XG4gICAgdGhpcy5fcXVldWVkT25seUlmTm90QmxvY2sgPSBzdGF0ZS5xdWV1ZWRPbmx5SWZOb3RCbG9jaztcbiAgfVxuXG4gIC8qKiBAaW50ZXJuYWwgKi9cbiAgcHJpdmF0ZSBfZ2V0SW5kZW50YXRpb25TdGF0ZSgpOiBJbmRlbnRhdGlvbkxldmVsU3RhdGUge1xuICAgIHJldHVybiB7XG4gICAgICBjdXJyZW50OiB0aGlzLl9jdXJyZW50SW5kZW50YXRpb24sXG4gICAgICBxdWV1ZWQ6IHRoaXMuX3F1ZXVlZEluZGVudGF0aW9uLFxuICAgICAgcXVldWVkT25seUlmTm90QmxvY2s6IHRoaXMuX3F1ZXVlZE9ubHlJZk5vdEJsb2NrLFxuICAgIH07XG4gIH1cbn1cblxuaW50ZXJmYWNlIEluZGVudGF0aW9uTGV2ZWxTdGF0ZSB7XG4gIGN1cnJlbnQ6IG51bWJlcjtcbiAgcXVldWVkOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gIHF1ZXVlZE9ubHlJZk5vdEJsb2NrOiB0cnVlIHwgdW5kZWZpbmVkO1xufVxuXG5mdW5jdGlvbiBpc1JlZ0V4U3RhcnQoY3VycmVudENoYXI6IG51bWJlciwgcGFzdENoYXI6IG51bWJlciB8IHVuZGVmaW5lZCwgcGFzdFBhc3RDaGFyOiBudW1iZXIgfCB1bmRlZmluZWQpIHtcbiAgcmV0dXJuIHBhc3RDaGFyID09PSBDSEFSUy5GT1JXQVJEX1NMQVNIXG4gICAgJiYgY3VycmVudENoYXIgIT09IENIQVJTLkZPUldBUkRfU0xBU0hcbiAgICAmJiBjdXJyZW50Q2hhciAhPT0gQ0hBUlMuQVNURVJJU0tcbiAgICAmJiBwYXN0UGFzdENoYXIgIT09IENIQVJTLkFTVEVSSVNLXG4gICAgJiYgcGFzdFBhc3RDaGFyICE9PSBDSEFSUy5GT1JXQVJEX1NMQVNIO1xufVxuXG5mdW5jdGlvbiBnZXRJbmRlbnRhdGlvblRleHQodXNlVGFiczogYm9vbGVhbiwgbnVtYmVyU3BhY2VzOiBudW1iZXIpIHtcbiAgaWYgKHVzZVRhYnMpIHtcbiAgICByZXR1cm4gXCJcXHRcIjtcbiAgfVxuICByZXR1cm4gQXJyYXkobnVtYmVyU3BhY2VzICsgMSkuam9pbihcIiBcIik7XG59XG5cbmZ1bmN0aW9uIGdldFNwYWNlc0FuZFRhYnNDb3VudChzdHI6IHN0cmluZykge1xuICBsZXQgc3BhY2VzQ291bnQgPSAwO1xuICBsZXQgdGFic0NvdW50ID0gMDtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IGNoYXJDb2RlID0gc3RyLmNoYXJDb2RlQXQoaSk7XG4gICAgaWYgKGNoYXJDb2RlID09PSBDSEFSUy5TUEFDRSkge1xuICAgICAgc3BhY2VzQ291bnQrKztcbiAgICB9IGVsc2UgaWYgKGNoYXJDb2RlID09PSBDSEFSUy5UQUIpIHtcbiAgICAgIHRhYnNDb3VudCsrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB7IHNwYWNlc0NvdW50LCB0YWJzQ291bnQgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxTQUFTLHFCQUFxQixFQUFFLHNCQUFzQixRQUFRLDBCQUEwQjtJQUV4RixjQUFjLEdBQ2Q7VUFBSyxXQUFXO0lBQVgsWUFBQSxZQUNILFVBQUEsS0FBQTtJQURHLFlBQUEsWUFFSCxVQUFBLEtBQUE7R0FGRyxnQkFBQTtBQStCTCwwSUFBMEk7QUFDMUksTUFBTSxRQUFRO0lBQ1osWUFBWSxLQUFLLFVBQVUsQ0FBQztJQUM1QixlQUFlLElBQUksVUFBVSxDQUFDO0lBQzlCLFVBQVUsS0FBSyxVQUFVLENBQUM7SUFDMUIsaUJBQWlCLEtBQUssVUFBVSxDQUFDO0lBQ2pDLFVBQVUsSUFBSSxVQUFVLENBQUM7SUFDekIsY0FBYyxLQUFLLFVBQVUsQ0FBQztJQUM5QixjQUFjLElBQUksVUFBVSxDQUFDO0lBQzdCLFdBQVcsSUFBSSxVQUFVLENBQUM7SUFDMUIsWUFBWSxJQUFJLFVBQVUsQ0FBQztJQUMzQixhQUFhLElBQUksVUFBVSxDQUFDO0lBQzVCLGFBQWEsSUFBSSxVQUFVLENBQUM7SUFDNUIsT0FBTyxJQUFJLFVBQVUsQ0FBQztJQUN0QixLQUFLLEtBQUssVUFBVSxDQUFDO0FBQ3ZCO0FBQ0EsTUFBTSxpQkFBaUIsSUFBSSxJQUFZO0lBQ3JDLE1BQU0sVUFBVTtJQUNoQixNQUFNLGFBQWE7SUFDbkIsTUFBTSxRQUFRO0lBQ2QsTUFBTSxlQUFlO0lBQ3JCLE1BQU0sUUFBUTtJQUNkLE1BQU0sWUFBWTtJQUNsQixNQUFNLFlBQVk7SUFDbEIsTUFBTSxTQUFTO0lBQ2YsTUFBTSxVQUFVO0lBQ2hCLE1BQU0sV0FBVztDQUNsQjtBQUVEOztDQUVDLEdBQ0QsZUFBZSxNQUFNO0lBQ25CLGNBQWMsR0FDZCxBQUFpQixpQkFBeUI7SUFDMUMsY0FBYyxHQUNkLEFBQWlCLFNBQXdCO0lBQ3pDLGNBQWMsR0FDZCxBQUFpQixTQUFrQjtJQUNuQyxjQUFjLEdBQ2QsQUFBaUIsV0FBbUI7SUFDcEMsY0FBYyxHQUNkLEFBQWlCLHNCQUE4QjtJQUMvQyxjQUFjLEdBQ2QsQUFBUSxzQkFBc0IsRUFBRTtJQUNoQyxjQUFjLEdBQ2QsQUFBUSxtQkFBdUM7SUFDL0MsY0FBYyxHQUNkLEFBQVEsc0JBQXdDO0lBQ2hELGNBQWMsR0FDZCxBQUFRLFVBQVUsRUFBRTtJQUNwQixjQUFjLEdBQ2QsQUFBUSxzQkFBc0IsS0FBSyxDQUFDO0lBQ3BDLGNBQWMsR0FDZCxBQUFRLHNCQUErQyxVQUFVO0lBQ2pFLGNBQWMsR0FDZCxBQUFRLG1CQUE2QixFQUFFLENBQUM7SUFDeEMsY0FBYyxHQUNkLEFBQVEsYUFBYSxLQUFLLENBQUM7SUFDM0IsY0FBYyxHQUNkLEFBQVEsd0JBQXdCLElBQUksQ0FBQztJQUNyQyx5RUFBeUU7SUFDekUsdUVBQXVFO0lBQ3ZFLGNBQWMsR0FDZCxBQUFRLFNBQW1CLEVBQUUsQ0FBQztJQUU5Qjs7O0dBR0MsR0FDRCxZQUFZLE9BQXlCLENBQUMsQ0FBQyxDQUFFO1FBQ3ZDLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxPQUFPLElBQUk7UUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLE9BQU8sSUFBSSxLQUFLO1FBQ3JDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxLQUFLLG9CQUFvQixJQUFJO1FBQzFELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxtQkFBbUIsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMscUJBQXFCO1FBQ3BGLElBQUksQ0FBQyxVQUFVLEdBQUcsS0FBSyxjQUFjLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNuRDtJQUVBOztHQUVDLEdBQ0QsYUFBc0I7UUFDcEIsT0FBTztZQUNMLHNCQUFzQixJQUFJLENBQUMscUJBQXFCO1lBQ2hELFNBQVMsSUFBSSxDQUFDLFFBQVE7WUFDdEIsU0FBUyxJQUFJLENBQUMsUUFBUTtZQUN0QixnQkFBZ0IsSUFBSSxDQUFDLFVBQVUsS0FBSztRQUN0QztJQUNGO0lBY0Esc0JBQXNCLFdBQTRCLEVBQUU7UUFDbEQsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQztRQUMzRCxJQUFJLENBQUMscUJBQXFCLEdBQUc7UUFDN0IsT0FBTyxJQUFJO0lBQ2I7SUFFQTs7O0dBR0MsR0FDRCxjQUFjLE1BQWtCLEVBQVE7UUFDdEMsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLG1CQUFtQixLQUFLLElBQUk7SUFDdEc7SUFFQTs7O0dBR0MsR0FDRCx5QkFBeUIsTUFBa0IsRUFBUTtRQUNqRCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFNO1lBQ3RDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEtBQUs7WUFDeEQsSUFBSSxDQUFDLHFCQUFxQixHQUFHLElBQUk7UUFDbkMsR0FBRztJQUNMO0lBY0Esb0JBQW9CLFdBQTRCLEVBQUU7UUFDaEQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQywyQkFBMkIsQ0FBQztRQUM1RCxPQUFPLElBQUk7SUFDYjtJQWlCQSxxQkFBcUIsV0FBNEIsRUFBRSxNQUFrQixFQUFFO1FBQ3JFLE9BQU8sSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWM7SUFDakY7SUFFQSxjQUFjLEdBQ2QsQUFBUSxzQkFBc0IsY0FBMEIsRUFBRSxXQUF1QixFQUFFO1FBQ2pGLE1BQU0sZ0JBQWdCLElBQUksQ0FBQyxvQkFBb0I7UUFDL0M7UUFDQSxJQUFJO1lBQ0Y7UUFDRixTQUFVO1lBQ1IsSUFBSSxDQUFDLG9CQUFvQixDQUFDO1FBQzVCO1FBQ0EsT0FBTyxJQUFJO0lBQ2I7SUFFQTs7R0FFQyxHQUNELHNCQUE4QjtRQUM1QixPQUFPLElBQUksQ0FBQyxtQkFBbUI7SUFDakM7SUFFQTs7O0dBR0MsR0FDRCxNQUFNLEtBQWtCLEVBQVE7UUFDOUIsSUFBSSxDQUFDLDRCQUE0QjtRQUNqQyxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLElBQUk7WUFDakQsSUFBSSxDQUFDLGNBQWM7UUFDckIsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLENBQUM7UUFDakIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUk7UUFDL0IsT0FBTyxJQUFJO0lBQ2I7SUFFQTs7O0dBR0MsR0FDRCxZQUFZLEtBQWtCLEVBQVE7UUFDcEMsSUFBSSxDQUFDLDRCQUE0QjtRQUNqQyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ1gsSUFBSSxDQUFDLG9CQUFvQixDQUFDO1FBQzFCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFFOUIsT0FBTyxJQUFJO0lBQ2I7SUFXQSxPQUFPLGVBQXNDLENBQUMsRUFBRTtRQUM5QyxJQUFJLE9BQU8saUJBQWlCLFVBQVU7WUFDcEMsSUFBSSxDQUFDLDRCQUE0QjtZQUNqQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztRQUNqRCxPQUFPO1lBQ0wsSUFBSSxDQUFDLG9CQUFvQixDQUFDO1lBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJO2dCQUN6QixJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSTtZQUNqQyxDQUFDO1lBQ0QsT0FBTyxJQUFJO1FBQ2IsQ0FBQztJQUNIO0lBRUEsY0FBYyxHQUNkLEFBQVEscUJBQXFCLEtBQWtCLEVBQUU7UUFDL0MsSUFBSSxJQUFJLENBQUMsV0FBVyxNQUFNLElBQUksRUFBRTtZQUM5QixJQUFJLENBQUMsZ0JBQWdCO1FBQ3ZCLENBQUM7UUFDRCxJQUFJLENBQUMsbUJBQW1CO1FBQ3hCLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxJQUFJO1FBQ2pDLElBQUksU0FBUyxJQUFJLEVBQUU7WUFDakI7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEtBQUs7UUFDbEMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixHQUFHO0lBQ3BFO0lBY0EscUJBQXFCLFNBQThCLEVBQUUsU0FBa0MsRUFBRTtRQUN2RixJQUFJLFdBQVc7WUFDYixJQUFJLENBQUMsU0FBUyxDQUFDLHVCQUF1QjtRQUN4QyxDQUFDO1FBRUQsT0FBTyxJQUFJO0lBQ2I7SUFFQTs7O0dBR0MsR0FDRCxVQUFVLElBQVksRUFBUTtRQUM1QixJQUFJLENBQUMsNEJBQTRCO1FBQ2pDLElBQUksSUFBSSxDQUFDLFdBQVcsTUFBTSxJQUFJLEVBQUU7WUFDOUIsSUFBSSxDQUFDLGdCQUFnQjtRQUN2QixDQUFDO1FBQ0QsSUFBSSxDQUFDLHVCQUF1QixDQUFDO1FBQzdCLElBQUksQ0FBQyxPQUFPO1FBRVosT0FBTyxJQUFJO0lBQ2I7SUFFQTs7R0FFQyxHQUNELG1CQUF5QjtRQUN2QixJQUFJLENBQUMsNEJBQTRCO1FBRWpDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxJQUFJO1lBQ3pCLElBQUksQ0FBQyxPQUFPO1FBQ2QsQ0FBQztRQUVELE9BQU8sSUFBSTtJQUNiO0lBRUE7O0dBRUMsR0FDRCxxQkFBMkI7UUFDekIsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUk7WUFDM0IsSUFBSSxDQUFDLFNBQVM7UUFDaEIsQ0FBQztRQUNELE9BQU8sSUFBSTtJQUNiO0lBRUE7OztHQUdDLEdBQ0QscUJBQXFCLFNBQThCLEVBQVE7UUFDekQsSUFBSSxXQUFXO1lBQ2IsSUFBSSxDQUFDLFNBQVM7UUFDaEIsQ0FBQztRQUNELE9BQU8sSUFBSTtJQUNiO0lBRUE7O0dBRUMsR0FDRCxZQUFrQjtRQUNoQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPO0lBQ3hDO0lBRUE7OztHQUdDLEdBQ0QsbUJBQW1CLFNBQThCLEVBQVE7UUFDdkQsSUFBSSxXQUFXO1lBQ2IsSUFBSSxDQUFDLE9BQU87UUFDZCxDQUFDO1FBQ0QsT0FBTyxJQUFJO0lBQ2I7SUFFQTs7R0FFQyxHQUNELFVBQWdCO1FBQ2QsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEtBQUs7UUFDaEMsSUFBSSxDQUFDLGlCQUFpQjtRQUN0QixPQUFPLElBQUk7SUFDYjtJQVdBLE1BQU0sSUFBYSxFQUFFO1FBQ25CLElBQUksQ0FBQyw0QkFBNEI7UUFDakMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFFBQVEsSUFBSSxHQUFHLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBRyxzQkFBc0IsTUFBTSxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxVQUFVO1FBQzlJLE9BQU8sSUFBSTtJQUNiO0lBRUE7O0dBRUMsR0FDRCxpQkFBdUI7UUFDckIsSUFBSSxDQUFDLDRCQUE0QjtRQUVqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSTtZQUN2QixJQUFJLENBQUMsdUJBQXVCLENBQUM7UUFDL0IsQ0FBQztRQUVELE9BQU8sSUFBSTtJQUNiO0lBRUE7OztHQUdDLEdBQ0QsTUFBTSxRQUFRLENBQUMsRUFBUTtRQUNyQixJQUFJLENBQUMsNEJBQTRCO1FBQ2pDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLE1BQU0sQ0FBQztRQUN4QyxPQUFPLElBQUk7SUFDYjtJQUVBOztHQUVDLEdBQ0QsZUFBcUI7UUFDbkIsSUFBSSxDQUFDLDRCQUE0QjtRQUVqQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSTtZQUNyQixJQUFJLENBQUMsdUJBQXVCLENBQUM7UUFDL0IsQ0FBQztRQUVELE9BQU8sSUFBSTtJQUNiO0lBRUE7OztHQUdDLEdBQ0QsSUFBSSxRQUFRLENBQUMsRUFBUTtRQUNuQixJQUFJLENBQUMsNEJBQTRCO1FBQ2pDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxLQUFLLE1BQU0sQ0FBQztRQUN6QyxPQUFPLElBQUk7SUFDYjtJQWNBLGlCQUFpQixTQUE4QixFQUFFLFVBQW1DLEVBQUU7UUFDcEYsSUFBSSxXQUFXO1lBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUI7UUFDcEMsQ0FBQztRQUVELE9BQU8sSUFBSTtJQUNiO0lBRUE7OztHQUdDLEdBQ0QsTUFBTSxJQUFZLEVBQVE7UUFDeEIsSUFBSSxDQUFDLDRCQUE0QjtRQUNqQyxJQUFJLENBQUMsdUJBQXVCLENBQUM7UUFDN0IsT0FBTyxJQUFJO0lBQ2I7SUFFQTs7R0FFQyxHQUNELGVBQXFCO1FBQ25CLE1BQU0sY0FBYyxJQUFJLENBQUMsbUJBQW1CO1FBRTVDLE9BQVE7WUFDTixLQUFLLFlBQVksSUFBSTtnQkFDbkIsSUFBSSxDQUFDLE9BQU87Z0JBQ1osS0FBTTtZQUNSLEtBQUssWUFBWSxJQUFJO2dCQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsSUFBSTtvQkFDekIsSUFBSSxDQUFDLGNBQWM7Z0JBQ3JCLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQztnQkFDWCxLQUFNO1lBQ1I7Z0JBQVM7b0JBQ1AsTUFBTSxtQkFBOEI7b0JBQ3BDLEtBQU07Z0JBQ1I7UUFDRjtRQUVBLE9BQU8sSUFBSTtJQUNiO0lBRUE7Ozs7Ozs7OztHQVNDLEdBQ0QsYUFBYSxHQUFXLEVBQUUsSUFBWSxFQUFRO1FBQzVDLE1BQU0sYUFBYSxJQUFJLENBQUMsT0FBTztRQUMvQixNQUFNLFFBQVEsSUFBSSxDQUFDLE1BQU07UUFDekI7UUFFQSxJQUFJLFFBQVEsWUFBWTtZQUN0QixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUM7UUFDcEIsQ0FBQztRQUVEO1FBQ0EsSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLE1BQU07UUFFM0IsT0FBTyxJQUFJO1FBRVgsU0FBUyxjQUFjO1lBQ3JCLElBQUksTUFBTSxHQUFHO2dCQUNYLE1BQU0sSUFBSSxNQUFNLENBQUMsc0JBQXNCLEVBQUUsSUFBSSxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3ZFLENBQUM7WUFDRCxJQUFJLE1BQU0sWUFBWTtnQkFDcEIsTUFBTSxJQUFJLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLHVDQUF1QyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUU7WUFDeEcsQ0FBQztRQUNIO1FBRUEsU0FBUyxzQkFBc0I7WUFDN0IsTUFBTSxFQUFFLE1BQUssRUFBRSxXQUFVLEVBQUUsR0FBRztZQUU5QixJQUFJLGVBQWUsR0FBRztnQkFDcEIsTUFBTSxNQUFNLENBQUMsT0FBTyxHQUFHO1lBQ3pCLE9BQU8sSUFBSSxlQUFlLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFO2dCQUM3QyxNQUFNLE1BQU0sQ0FBQyxRQUFRLEdBQUcsR0FBRztZQUM3QixPQUFPO2dCQUNMLE1BQU0sV0FBVyxLQUFLLENBQUMsTUFBTTtnQkFDN0IsTUFBTSxZQUFZLFNBQVMsU0FBUyxDQUFDLEdBQUc7Z0JBQ3hDLE1BQU0sVUFBVSxTQUFTLFNBQVMsQ0FBQztnQkFDbkMsTUFBTSxNQUFNLENBQUMsT0FBTyxHQUFHLFdBQVcsTUFBTTtZQUMxQyxDQUFDO1FBQ0g7UUFFQSxTQUFTLDZCQUE2QjtZQUNwQyxJQUFJLE1BQU0sYUFBYSxHQUFHO2dCQUN4QixpQ0FBaUM7Z0JBQ2pDLElBQUksU0FBUztnQkFDYixJQUFLLElBQUksSUFBSSxHQUFHLElBQUksTUFBTSxNQUFNLEVBQUUsSUFBSztvQkFDckMsTUFBTSxXQUFXLEtBQUssQ0FBQyxFQUFFO29CQUN6QixNQUFNLFdBQVc7b0JBQ2pCLFVBQVUsU0FBUyxNQUFNO29CQUN6QixJQUFJLFVBQVUsS0FBSzt3QkFDakIsT0FBTzs0QkFBRSxPQUFPOzRCQUFHLFlBQVksTUFBTTt3QkFBUztvQkFDaEQsQ0FBQztnQkFDSDtZQUNGLE9BQU87Z0JBQ0wsZ0NBQWdDO2dCQUNoQyxJQUFJLFlBQVc7Z0JBQ2YsSUFBSyxJQUFJLEtBQUksTUFBTSxNQUFNLEdBQUcsR0FBRyxNQUFLLEdBQUcsS0FBSztvQkFDMUMsTUFBTSxZQUFXLEtBQUssQ0FBQyxHQUFFO29CQUN6QixhQUFZLFVBQVMsTUFBTTtvQkFDM0IsSUFBSSxhQUFZLEtBQUs7d0JBQ25CLE9BQU87NEJBQUUsT0FBTzs0QkFBRyxZQUFZLE1BQU07d0JBQVM7b0JBQ2hELENBQUM7Z0JBQ0g7WUFDRixDQUFDO1lBRUQsTUFBTSxJQUFJLE1BQU0sNERBQTREO1FBQzlFO0lBQ0Y7SUFFQTs7R0FFQyxHQUNELFlBQW9CO1FBQ2xCLE9BQU8sSUFBSSxDQUFDLE9BQU87SUFDckI7SUFFQTs7R0FFQyxHQUNELGNBQXVCO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixLQUFLO0lBQ3RDO0lBRUE7O0dBRUMsR0FDRCw4QkFBdUM7UUFDckMsT0FBTyxJQUFJLENBQUMsb0JBQW9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsYUFBYSxNQUFNLElBQUksQ0FBQyxXQUFXLE1BQU0sSUFBSTtJQUMzRjtJQUVBOztHQUVDLEdBQ0QsdUJBQWdDO1FBQzlCLE9BQU8sSUFBSSxDQUFDLHFCQUFxQjtJQUNuQztJQUVBOztHQUVDLEdBQ0QsYUFBc0I7UUFDcEIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxHQUFHLEtBQUssSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsRUFBRSxLQUFLLE1BQU0sVUFBVTtJQUN6SDtJQUVBOztHQUVDLEdBQ0QsZ0JBQXlCO1FBQ3ZCLE1BQU0sV0FBVyxJQUFJLENBQUMsV0FBVztRQUNqQyxPQUFPLGFBQWEsUUFBUSxhQUFhO0lBQzNDO0lBRUE7O0dBRUMsR0FDRCxrQkFBMkI7UUFDekIsSUFBSSxhQUFhO1FBRWpCLDhFQUE4RTtRQUM5RSx1Q0FBdUM7UUFDdkMsSUFBSyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxLQUFLLEdBQUcsSUFBSztZQUNoRCxNQUFNLGNBQWMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2xDLElBQUssSUFBSSxJQUFJLFlBQVksTUFBTSxHQUFHLEdBQUcsS0FBSyxHQUFHLElBQUs7Z0JBQ2hELE1BQU0sY0FBYyxZQUFZLFVBQVUsQ0FBQztnQkFDM0MsSUFBSSxnQkFBZ0IsTUFBTSxRQUFRLEVBQUU7b0JBQ2xDO29CQUNBLElBQUksZUFBZSxHQUFHO3dCQUNwQixPQUFPLElBQUk7b0JBQ2IsQ0FBQztnQkFDSCxPQUFPLElBQUksZ0JBQWdCLE1BQU0sZUFBZSxFQUFFO29CQUNoRCxPQUFPLEtBQUs7Z0JBQ2QsQ0FBQztZQUNIO1FBQ0Y7UUFFQSxPQUFPLEtBQUs7SUFDZDtJQUVBOztHQUVDLEdBQ0QsY0FBdUI7UUFDckIsT0FBTyxJQUFJLENBQUMsV0FBVyxPQUFPO0lBQ2hDO0lBRUE7O0dBRUMsR0FDRCxZQUFxQjtRQUNuQixPQUFPLElBQUksQ0FBQyxXQUFXLE9BQU87SUFDaEM7SUFFQTs7R0FFQyxHQUNELGNBQWtDO1FBQ2hDLE1BQU0sV0FBVyxJQUFJLENBQUMsMEJBQTBCLENBQUM7UUFDakQsT0FBTyxZQUFZLElBQUksR0FBRyxZQUFZLE9BQU8sWUFBWSxDQUFDLFNBQVM7SUFDckU7SUFFQTs7O0dBR0MsR0FDRCxTQUFTLElBQVksRUFBVztRQUM5QixNQUFNLFNBQVMsSUFBSSxDQUFDLE9BQU87UUFDM0IsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxVQUFVLFFBQVU7WUFDcEQsTUFBTSxTQUFTLFNBQVM7WUFDeEIsTUFBTSxZQUFZLEtBQUssTUFBTSxHQUFHO1lBQ2hDLElBQUksS0FBSyxVQUFVLENBQUMsZUFBZSxVQUFVO2dCQUMzQyxPQUFPLEtBQUs7WUFDZCxDQUFDO1lBQ0QsT0FBTyxjQUFjLElBQUksSUFBSSxHQUFHLFNBQVM7UUFDM0MsTUFBTSxLQUFLO0lBQ2I7SUFFQTs7Ozs7O0dBTUMsR0FDRCxpQkFBb0IsTUFBc0QsRUFBaUI7UUFDekYsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxVQUFVLFFBQVUsT0FBTyxPQUFPLFlBQVksQ0FBQyxXQUFXO0lBQzlGO0lBRUE7Ozs7Ozs7R0FPQyxHQUNELHFCQUF3QixNQUEwRCxFQUFpQjtRQUNqRyxJQUFJLFFBQVEsSUFBSSxDQUFDLE9BQU87UUFDeEIsSUFBSyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxLQUFLLEdBQUcsSUFBSztZQUNoRCxNQUFNLGNBQWMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2xDLElBQUssSUFBSSxJQUFJLFlBQVksTUFBTSxHQUFHLEdBQUcsS0FBSyxHQUFHLElBQUs7Z0JBQ2hEO2dCQUNBLE1BQU0sU0FBUyxPQUFPLFlBQVksVUFBVSxDQUFDLElBQUk7Z0JBQ2pELElBQUksVUFBVSxJQUFJLEVBQUU7b0JBQ2xCLE9BQU87Z0JBQ1QsQ0FBQztZQUNIO1FBQ0Y7UUFDQSxPQUFPO0lBQ1Q7SUFFQTs7R0FFQyxHQUNELFdBQW1CO1FBQ2pCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRztZQUMxQixNQUFNLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUc7WUFDckIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDbkIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUk7SUFDM0I7SUFFQSxjQUFjLEdBQ2QsT0FBd0IsZ0JBQWdCLFFBQVE7SUFDaEQsY0FBYyxHQUNkLEFBQVEsd0JBQXdCLElBQVksRUFBRTtRQUM1QyxPQUFPLFFBQVE7UUFDZixJQUFJLEtBQUssTUFBTSxLQUFLLEdBQUc7WUFDckIsZ0JBQWdCLElBQUksRUFBRTtZQUN0QjtRQUNGLENBQUM7UUFFRCxNQUFNLFFBQVEsS0FBSyxLQUFLLENBQUMsZ0JBQWdCLGFBQWE7UUFDdEQsTUFBTSxPQUFPLENBQUMsQ0FBQyxHQUFHLElBQU07WUFDdEIsSUFBSSxJQUFJLEdBQUc7Z0JBQ1QsSUFBSSxDQUFDLGlCQUFpQjtZQUN4QixDQUFDO1lBRUQsSUFBSSxFQUFFLE1BQU0sS0FBSyxHQUFHO2dCQUNsQjtZQUNGLENBQUM7WUFFRCxnQkFBZ0IsSUFBSSxFQUFFO1FBQ3hCO1FBRUEsU0FBUyxnQkFBZ0IsTUFBdUIsRUFBRSxDQUFTLEVBQUU7WUFDM0QsSUFBSSxDQUFDLE9BQU8sVUFBVSxJQUFJO2dCQUN4QixNQUFNLGtCQUFrQixPQUFPLGFBQWEsTUFBTSxPQUFPLFdBQVcsTUFBTSxJQUFJO2dCQUM5RSxJQUFJLGlCQUFpQjtvQkFDbkIsT0FBTyxpQkFBaUI7Z0JBQzFCLENBQUM7WUFDSCxDQUFDO1lBRUQsT0FBTyxvQkFBb0IsQ0FBQztZQUM1QixPQUFPLGNBQWMsQ0FBQztRQUN4QjtJQUNGO0lBRUEsY0FBYyxHQUNkLEFBQVEsb0JBQW9CO1FBQzFCLElBQUksSUFBSSxDQUFDLG1CQUFtQixLQUFLLFlBQVksSUFBSSxFQUFFO1lBQ2pELElBQUksQ0FBQyxtQkFBbUIsR0FBRztRQUM3QixDQUFDO1FBRUQsTUFBTSx3QkFBd0IsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsRUFBRTtRQUNyRixJQUFJLENBQUMsMEJBQTBCLE1BQU0sWUFBWSxJQUFJLDBCQUEwQixNQUFNLFlBQVksS0FBSyxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxNQUFNLFVBQVUsRUFBRTtZQUM3SixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRztRQUMzQixDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsUUFBUTtRQUNqQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsS0FBSztRQUNsQyxJQUFJLENBQUMseUJBQXlCO0lBQ2hDO0lBRUEsY0FBYyxHQUNkLEFBQVEsNEJBQTRCO1FBQ2xDLElBQUksSUFBSSxDQUFDLGtCQUFrQixJQUFJLElBQUksRUFBRTtZQUNuQztRQUNGLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxxQkFBcUIsSUFBSSxhQUFhLElBQUksR0FBRztZQUNwRCxJQUFJLENBQUMsa0JBQWtCLEdBQUc7WUFDMUIsSUFBSSxDQUFDLHFCQUFxQixHQUFHO1FBQy9CLE9BQU87WUFDTCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFDLGtCQUFrQjtZQUNsRCxJQUFJLENBQUMsa0JBQWtCLEdBQUc7UUFDNUIsQ0FBQztRQUVELFNBQVMsYUFBYSxNQUF1QixFQUFFO1lBQzdDLElBQUksZUFBZSxLQUFLO1lBQ3hCLE9BQU8sT0FBTyxvQkFBb0IsQ0FBQyxDQUFBLFdBQVk7Z0JBQzdDLE9BQVE7b0JBQ04sS0FBSyxNQUFNLFFBQVE7d0JBQ2pCLElBQUksY0FBYzs0QkFDaEIsT0FBTyxLQUFLO3dCQUNkLE9BQU87NEJBQ0wsZUFBZSxJQUFJO3dCQUNyQixDQUFDO3dCQUNELEtBQU07b0JBQ1IsS0FBSyxNQUFNLGVBQWU7d0JBQ3hCLE9BQU87b0JBQ1QsS0FBSyxNQUFNLFVBQVU7d0JBQ25CLE9BQU8sSUFBSTtvQkFDYjt3QkFDRSxPQUFPLEtBQUs7Z0JBQ2hCO1lBQ0Y7UUFDRjtJQUNGO0lBRUEsY0FBYyxHQUNkLEFBQVEscUJBQXFCLEdBQVcsRUFBRTtRQUN4QyxJQUFLLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxNQUFNLEVBQUUsSUFBSztZQUNuQyxNQUFNLGNBQWMsSUFBSSxVQUFVLENBQUM7WUFFbkMsZ0dBQWdHO1lBQ2hHLDJGQUEyRjtZQUMzRiwwRUFBMEU7WUFDMUUsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLGNBQWM7Z0JBQ3BDLFFBQVM7WUFDWCxDQUFDO1lBRUQsTUFBTSxXQUFXLE1BQU0sSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUU7WUFDckYsTUFBTSxlQUFlLE1BQU0sSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxNQUFNLElBQUksSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssSUFBSSxVQUFVLENBQUMsSUFBSSxFQUFFO1lBRXhJLGVBQWU7WUFDZixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7Z0JBQ25CLElBQUksYUFBYSxNQUFNLGFBQWEsSUFBSSxpQkFBaUIsTUFBTSxVQUFVLElBQUksYUFBYSxNQUFNLFFBQVEsRUFBRTtvQkFDeEcsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLO2dCQUN6QixPQUFPO29CQUNMLFFBQVM7Z0JBQ1gsQ0FBQztZQUNILE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxNQUFNLGFBQWEsYUFBYSxVQUFVLGVBQWU7Z0JBQ3pHLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSTtnQkFDdEIsUUFBUztZQUNYLENBQUM7WUFFRCxrQkFBa0I7WUFDbEIsSUFBSSxJQUFJLENBQUMsbUJBQW1CLElBQUksSUFBSSxJQUFJLGFBQWEsTUFBTSxhQUFhLElBQUksZ0JBQWdCLE1BQU0sYUFBYSxFQUFFO2dCQUMvRyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsWUFBWSxJQUFJO1lBQzdDLE9BQU8sSUFBSSxJQUFJLENBQUMsbUJBQW1CLElBQUksSUFBSSxJQUFJLGFBQWEsTUFBTSxhQUFhLElBQUksZ0JBQWdCLE1BQU0sUUFBUSxFQUFFO2dCQUNqSCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsWUFBWSxJQUFJO1lBQzdDLE9BQU8sSUFBSSxJQUFJLENBQUMsbUJBQW1CLEtBQUssWUFBWSxJQUFJLElBQUksYUFBYSxNQUFNLFFBQVEsSUFBSSxnQkFBZ0IsTUFBTSxhQUFhLEVBQUU7Z0JBQzlILElBQUksQ0FBQyxtQkFBbUIsR0FBRztZQUM3QixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJO2dCQUN0QixRQUFTO1lBQ1gsQ0FBQztZQUVELGlCQUFpQjtZQUNqQixNQUFNLHdCQUF3QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxLQUFLLElBQUksWUFBWSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxFQUFFO1lBQ3RJLElBQUksYUFBYSxNQUFNLFVBQVUsSUFBSSxDQUFDLGdCQUFnQixNQUFNLFlBQVksSUFBSSxnQkFBZ0IsTUFBTSxZQUFZLElBQUksZ0JBQWdCLE1BQU0sU0FBUyxHQUFHO2dCQUNsSixJQUFJLDBCQUEwQixhQUFhO29CQUN6QyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRztnQkFDM0IsT0FBTyxJQUFJLDBCQUEwQixNQUFNLFVBQVUsSUFBSSwwQkFBMEIsV0FBVztvQkFDNUYsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQztnQkFDN0IsQ0FBQztZQUNILE9BQU8sSUFBSSxpQkFBaUIsTUFBTSxVQUFVLElBQUksYUFBYSxNQUFNLFdBQVcsSUFBSSxnQkFBZ0IsTUFBTSxVQUFVLElBQUksMEJBQTBCLE1BQU0sU0FBUyxFQUFFO2dCQUMvSixJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDO1lBQzdCLE9BQU8sSUFBSSxnQkFBZ0IsTUFBTSxXQUFXLElBQUksMEJBQTBCLE1BQU0sVUFBVSxFQUFFO2dCQUMxRixJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRztZQUMzQixDQUFDO1FBQ0g7SUFDRjtJQUVBLDBEQUEwRCxHQUMxRCwyQkFBMkIsTUFBYyxFQUFFO1FBQ3pDLElBQUksVUFBVSxJQUFJLENBQUMsT0FBTyxJQUFJLFNBQVMsR0FBRztZQUN4QyxPQUFPO1FBQ1QsQ0FBQztRQUVELElBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsS0FBSyxHQUFHLElBQUs7WUFDaEQsTUFBTSxjQUFjLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNsQyxJQUFJLFVBQVUsWUFBWSxNQUFNLEVBQUU7Z0JBQ2hDLFVBQVUsWUFBWSxNQUFNO1lBQzlCLE9BQU87Z0JBQ0wsT0FBTyxZQUFZLFVBQVUsQ0FBQyxZQUFZLE1BQU0sR0FBRyxJQUFJO1lBQ3pELENBQUM7UUFDSDtRQUNBLE9BQU87SUFDVDtJQUVBLGNBQWMsR0FDZCxBQUFRLG9CQUFvQjtRQUMxQixNQUFNLHFCQUFxQixLQUFLLEtBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CO1FBQzlELElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQztRQUVqRCxNQUFNLFdBQVcsSUFBSSxDQUFDLG1CQUFtQixHQUFHO1FBQzVDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNqQixJQUFJLFdBQVcsS0FBSztnQkFDbEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCO1lBQzNDLENBQUM7UUFDSCxPQUFPO1lBQ0wsTUFBTSxVQUFVLEtBQUssS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUc7WUFFMUQsb0VBQW9FO1lBQ3BFLElBQUksT0FBTztZQUNYLElBQUssSUFBSSxJQUFJLEdBQUcsSUFBSSxTQUFTLElBQUs7Z0JBQ2hDLFFBQVEsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEVBQUU7WUFDbEM7WUFDQSxJQUFJLENBQUMsY0FBYyxDQUFDO1FBQ3RCLENBQUM7SUFDSDtJQUVBLGNBQWMsR0FDZCxBQUFRLCtCQUErQjtRQUNyQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFO1lBQzdCO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxLQUFLO1FBQ2hDLElBQUksQ0FBQyxPQUFPO0lBQ2Q7SUFFQSxjQUFjLEdBQ2QsQUFBUSxlQUFlLElBQVksRUFBRTtRQUNuQyxJQUFJLEtBQUssTUFBTSxLQUFLLEdBQUc7WUFDckI7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFDakIsSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLE1BQU07SUFDN0I7SUFFQSxjQUFjLEdBQ2QsT0FBd0IscUJBQXFCLFdBQVc7SUFDeEQsY0FBYyxHQUNkLEFBQVEsNEJBQTRCLFdBQTRCLEVBQUU7UUFDaEUsSUFBSSxPQUFPLGdCQUFnQixVQUFVO1lBQ25DLElBQUksY0FBYyxHQUFHO2dCQUNuQixNQUFNLElBQUksTUFBTSxxRUFBcUU7WUFDdkYsQ0FBQztZQUNELE9BQU87UUFDVCxPQUFPLElBQUksT0FBTyxnQkFBZ0IsVUFBVTtZQUMxQyxJQUFJLENBQUMsZ0JBQWdCLGtCQUFrQixDQUFDLElBQUksQ0FBQyxjQUFjO2dCQUN6RCxNQUFNLElBQUksTUFBTSxpRUFBaUU7WUFDbkYsQ0FBQztZQUVELE1BQU0sRUFBRSxZQUFXLEVBQUUsVUFBUyxFQUFFLEdBQUcsc0JBQXNCO1lBQ3pELE9BQU8sWUFBWSxjQUFjLElBQUksQ0FBQyxxQkFBcUI7UUFDN0QsT0FBTztZQUNMLE1BQU0sSUFBSSxNQUFNLGlEQUFpRDtRQUNuRSxDQUFDO0lBQ0g7SUFFQSxjQUFjLEdBQ2QsQUFBUSxxQkFBcUIsS0FBNEIsRUFBRTtRQUN6RCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsTUFBTSxPQUFPO1FBQ3hDLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxNQUFNLE1BQU07UUFDdEMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLE1BQU0sb0JBQW9CO0lBQ3pEO0lBRUEsY0FBYyxHQUNkLEFBQVEsdUJBQThDO1FBQ3BELE9BQU87WUFDTCxTQUFTLElBQUksQ0FBQyxtQkFBbUI7WUFDakMsUUFBUSxJQUFJLENBQUMsa0JBQWtCO1lBQy9CLHNCQUFzQixJQUFJLENBQUMscUJBQXFCO1FBQ2xEO0lBQ0Y7QUFDRixDQUFDO0FBUUQsU0FBUyxhQUFhLFdBQW1CLEVBQUUsUUFBNEIsRUFBRSxZQUFnQyxFQUFFO0lBQ3pHLE9BQU8sYUFBYSxNQUFNLGFBQWEsSUFDbEMsZ0JBQWdCLE1BQU0sYUFBYSxJQUNuQyxnQkFBZ0IsTUFBTSxRQUFRLElBQzlCLGlCQUFpQixNQUFNLFFBQVEsSUFDL0IsaUJBQWlCLE1BQU0sYUFBYTtBQUMzQztBQUVBLFNBQVMsbUJBQW1CLE9BQWdCLEVBQUUsWUFBb0IsRUFBRTtJQUNsRSxJQUFJLFNBQVM7UUFDWCxPQUFPO0lBQ1QsQ0FBQztJQUNELE9BQU8sTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDO0FBQ3RDO0FBRUEsU0FBUyxzQkFBc0IsR0FBVyxFQUFFO0lBQzFDLElBQUksY0FBYztJQUNsQixJQUFJLFlBQVk7SUFFaEIsSUFBSyxJQUFJLElBQUksR0FBRyxJQUFJLElBQUksTUFBTSxFQUFFLElBQUs7UUFDbkMsTUFBTSxXQUFXLElBQUksVUFBVSxDQUFDO1FBQ2hDLElBQUksYUFBYSxNQUFNLEtBQUssRUFBRTtZQUM1QjtRQUNGLE9BQU8sSUFBSSxhQUFhLE1BQU0sR0FBRyxFQUFFO1lBQ2pDO1FBQ0YsQ0FBQztJQUNIO0lBRUEsT0FBTztRQUFFO1FBQWE7SUFBVTtBQUNsQyJ9