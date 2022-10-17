/**
* autoNumeric.js
* @author: Bob Knothe
* @author: Sokolov Yura aka funny_falcon
* @version: 1.9.17 - 2013-12-03 GMT 9:00 PM
*
* Created by Robert J. Knothe on 2010-10-25. Please report any bugs to https://github.com/BobKnothe/autoNumeric
* Created by Sokolov Yura on 2010-11-07
*
* Copyright (c) 2011 Robert J. Knothe http://www.decorplanit.com/plugin/
*
* The MIT License (http://www.opensource.org/licenses/mit-license.php)
*
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use,
* copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the
* Software is furnished to do so, subject to the following
* conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
* OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
* WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
* FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
* OTHER DEALINGS IN THE SOFTWARE.
*/
(function ($) {
    "use strict";
    /*jslint browser: true*/
    /*global jQuery: false*/
    /* Cross browser routine for getting selected range/cursor position
     */
    function getElementSelection(that) {
        var position = {};
        if (that.selectionStart === undefined) {
            that.focus();
            var select = document.selection.createRange();
            position.length = select.text.length;
            select.moveStart('character', -that.value.length);
            position.end = select.text.length;
            position.start = position.end - position.length;
        } else {
            position.start = that.selectionStart;
            position.end = that.selectionEnd;
            position.length = position.end - position.start;
        }
        return position;
    }
    /**
     * Cross browser routine for setting selected range/cursor position
     */
    function setElementSelection(that, start, end) {
        if (that.selectionStart === undefined) {
            that.focus();
            var r = that.createTextRange();
            r.collapse(true);
            r.moveEnd('character', end);
            r.moveStart('character', start);
            r.select();
        } else {
            that.selectionStart = start;
            that.selectionEnd = end;
        }
    }
    /**
     * run callbacks in parameters if any
     * any parameter could be a callback:
     * - a function, which invoked with jQuery element, parameters and this parameter name and returns parameter value
     * - a name of function, attached to $(selector).autoNumeric.functionName(){} - which was called previously
     */
    function runCallbacks($this, settings) {
        /**
         * loops through the settings object (option array) to find the following
         * k = option name example k=aNum
         * val = option value example val=0123456789
         */
        $.each(settings, function (k, val) {
            if (typeof val === 'function') {
                settings[k] = val($this, settings, k);
            } else if (typeof $this.autoNumeric[val] === 'function') {
                /**
                 * calls the attached function from the html5 data example: data-a-sign="functionName"
                 */
                settings[k] = $this.autoNumeric[val]($this, settings, k);
            }
        });
    }
    function convertKeyToNumber(settings, key) {
        if (typeof (settings[key]) === 'string') {
            settings[key] *= 1;
        }
    }
    /**
     * Preparing user defined options for further usage
     * merge them with defaults appropriately
     */
    function autoCode($this, settings) {
        runCallbacks($this, settings);
        settings.oEvent = null;
        settings.tagList = ['B', 'CAPTION', 'CITE', 'CODE', 'DD', 'DEL', 'DIV', 'DFN', 'DT', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'INS', 'KDB', 'LABEL', 'LI', 'OUTPUT', 'P', 'Q', 'S', 'SAMPLE', 'SPAN', 'STRONG', 'TD', 'TH', 'U', 'VAR'];
        var vmax = settings.vMax.toString().split('.'),
            vmin = (!settings.vMin && settings.vMin !== 0) ? [] : settings.vMin.toString().split('.');
        convertKeyToNumber(settings, 'vMax');
        convertKeyToNumber(settings, 'vMin');
        convertKeyToNumber(settings, 'mDec'); /** set mDec if not defained by user */
        settings.allowLeading = true;
        settings.aNeg = settings.vMin < 0 ? '-' : '';
        vmax[0] = vmax[0].replace('-', '');
        vmin[0] = vmin[0].replace('-', '');
        settings.mInt = Math.max(vmax[0].length, vmin[0].length, 1);
        if (settings.mDec === null) {
            var vmaxLength = 0,
                vminLength = 0;
            if (vmax[1]) {
                vmaxLength = vmax[1].length;
            }
            if (vmin[1]) {
                vminLength = vmin[1].length;
            }
            settings.mDec = Math.max(vmaxLength, vminLength);
        } /** set alternative decimal separator key */
        if (settings.altDec === null && settings.mDec > 0) {
            if (settings.aDec === '.' && settings.aSep !== ',') {
                settings.altDec = ',';
            } else if (settings.aDec === ',' && settings.aSep !== '.') {
                settings.altDec = '.';
            }
        }
        /** cache regexps for autoStrip */
        var aNegReg = settings.aNeg ? '([-\\' + settings.aNeg + ']?)' : '(-?)';
        settings.aNegRegAutoStrip = aNegReg;
        settings.skipFirstAutoStrip = new RegExp(aNegReg + '[^-' + (settings.aNeg ? '\\' + settings.aNeg : '') + '\\' + settings.aDec + '\\d]' + '.*?(\\d|\\' + settings.aDec + '\\d)');
        settings.skipLastAutoStrip = new RegExp('(\\d\\' + settings.aDec + '?)[^\\' + settings.aDec + '\\d]\\D*$');
        var allowed = '-' + settings.aNum + '\\' + settings.aDec;
        settings.allowedAutoStrip = new RegExp('[^' + allowed + ']', 'gi');
        settings.numRegAutoStrip = new RegExp(aNegReg + '(?:\\' + settings.aDec + '?(\\d+\\' + settings.aDec + '\\d+)|(\\d*(?:\\' + settings.aDec + '\\d*)?))');
        return settings;
    }
    /**
     * strip all unwanted characters and leave only a number alert
     */
    function autoStrip(s, settings, strip_zero) {
        if (settings.aSign) { /** remove currency sign */
            while (s.indexOf(settings.aSign) > -1) {
                s = s.replace(settings.aSign, '');
            }
        }
        s = s.replace(settings.skipFirstAutoStrip, '$1$2'); /** first replace anything before digits */
        s = s.replace(settings.skipLastAutoStrip, '$1'); /** then replace anything after digits */
        s = s.replace(settings.allowedAutoStrip, ''); /** then remove any uninterested characters */
        if (settings.altDec) {
            s = s.replace(settings.altDec, settings.aDec);
        } /** get only number string */
        var m = s.match(settings.numRegAutoStrip);
        s = m ? [m[1], m[2], m[3]].join('') : '';
        if ((settings.lZero === 'allow' || settings.lZero === 'keep') && strip_zero !== 'strip') {
            var parts = [],
                nSign = '';
            parts = s.split(settings.aDec);
            if (parts[0].indexOf('-') !== -1) {
                nSign = '-';
                parts[0] = parts[0].replace('-', '');
            }
            if (parts[0].length > settings.mInt && parts[0].charAt(0) === '0') { /** strip leading zero if need */
                parts[0] = parts[0].slice(1);
            }
            s = nSign + parts.join(settings.aDec);
        }
        if ((strip_zero && settings.lZero === 'deny') || (strip_zero && settings.lZero === 'allow' && settings.allowLeading === false)) {
            var strip_reg = '^' + settings.aNegRegAutoStrip + '0*(\\d' + (strip_zero === 'leading' ? ')' : '|$)');
            strip_reg = new RegExp(strip_reg);
            s = s.replace(strip_reg, '$1$2');
        }
        return s;
    }
    /**
     * places or removes brackets on negative values
     */
    function negativeBracket(s, nBracket, oEvent) { /** oEvent = settings.oEvent */
        nBracket = nBracket.split(',');
        if (oEvent === 'set' || oEvent === 'focusout') {
            s = s.replace('-', '');
            s = nBracket[0] + s + nBracket[1];
        } else if ((oEvent === 'get' || oEvent === 'focusin' || oEvent === 'pageLoad') && s.charAt(0) === nBracket[0]) {
            s = s.replace(nBracket[0], '-');
            s = s.replace(nBracket[1], '');
        }
        return s;
    }
    /**
     * truncate decimal part of a number
     */
    function truncateDecimal(s, aDec, mDec) {
        if (aDec && mDec) {
            var parts = s.split(aDec);
            /** truncate decimal part to satisfying length
             * cause we would round it anyway */
            if (parts[1] && parts[1].length > mDec) {
                if (mDec > 0) {
                    parts[1] = parts[1].substring(0, mDec);
                    s = parts.join(aDec);
                } else {
                    s = parts[0];
                }
            }
        }
        return s;
    }
    /**
     * prepare number string to be converted to real number
     */
    function fixNumber(s, aDec, aNeg) {
        if (aDec && aDec !== '.') {
            s = s.replace(aDec, '.');
        }
        if (aNeg && aNeg !== '-') {
            s = s.replace(aNeg, '-');
        }
        if (!s.match(/\d/)) {
            s += '0';
        }
        return s;
    }
    /**
     * function to handle numbers less than 0 that are stored in Exponential notation ex: .0000001 stored as 1e-7
     */
    function checkValue(value, settings) {
        var decimal = value.indexOf('.'),
            checkSmall = +value;
        if (decimal !== -1) {
            if (checkSmall < 0.000001 && checkSmall > -1) {
                value = +value;
                if (value < 0.000001 && value > 0) {
                    value = (value + 10).toString();
                    value = value.substring(1);
                }
                if (value < 0 && value > -1) {
                    value = (value - 10).toString();
                    value = '-' + value.substring(2);
                }
                value = value.toString();
            } else {
                var parts = value.split('.');
                if (parts[1] !== undefined) {
                    if (+parts[1] === 0) {
                        value = parts[0];
                    } else {
                        parts[1] = parts[1].replace(/0*$/, '');
                        value = parts.join('.');
                    }
                }
            }
        }
        return (settings.lZero === 'keep') ? value : value.replace(/^0*(\d)/, '$1');
    }
    /**
     * prepare real number to be converted to our format
     */
    function presentNumber(s, aDec, aNeg) {
        if (aNeg && aNeg !== '-') {
            s = s.replace('-', aNeg);
        }
        if (aDec && aDec !== '.') {
            s = s.replace('.', aDec);
        }
        return s;
    }
    /**
     * checking that number satisfy format conditions
     * and lays between settings.vMin and settings.vMax
     * and the string length does not exceed the digits in settings.vMin and settings.vMax
     */
    function autoCheck(s, settings) {
        s = autoStrip(s, settings);
        s = truncateDecimal(s, settings.aDec, settings.mDec);
        s = fixNumber(s, settings.aDec, settings.aNeg);
        var value = +s;
        if (settings.oEvent === 'set' && (value < settings.vMin || value > settings.vMax)) {
            $.error("The value (" + value + ") from the 'set' method falls outside of the vMin / vMax range");
        }
        return value >= settings.vMin && value <= settings.vMax;
    }
    /**
     * private function to check for empty value
     */
    function checkEmpty(iv, settings, signOnEmpty) {
        if (iv === '' || iv === settings.aNeg) {
            if (settings.wEmpty === 'zero') {
                return iv + '0';
            }
            if (settings.wEmpty === 'sign' || signOnEmpty) {
                return iv + settings.aSign;
            }
            return iv;
        }
        return null;
    }
    /**
     * private function that formats our number
     */
    function autoGroup(iv, settings) {
        iv = autoStrip(iv, settings);
        var testNeg = iv.replace(',', '.'),
            empty = checkEmpty(iv, settings, true);
        if (empty !== null) {
            return empty;
        }
        var digitalGroup = '';
        if (settings.dGroup === 2) {
            digitalGroup = /(\d)((\d)(\d{2}?)+)$/;
        } else if (settings.dGroup === 4) {
            digitalGroup = /(\d)((\d{4}?)+)$/;
        } else {
            digitalGroup = /(\d)((\d{3}?)+)$/;
        } /** splits the string at the decimal string */
        var ivSplit = iv.split(settings.aDec);
        if (settings.altDec && ivSplit.length === 1) {
            ivSplit = iv.split(settings.altDec);
        } /** assigns the whole number to the a varibale (s) */
        var s = ivSplit[0];
        if (settings.aSep) {
            while (digitalGroup.test(s)) { /** re-inserts the thousand sepparator via a regualer expression */
                s = s.replace(digitalGroup, '$1' + settings.aSep + '$2');
            }
        }
        if (settings.mDec !== 0 && ivSplit.length > 1) {
            if (ivSplit[1].length > settings.mDec) {
                ivSplit[1] = ivSplit[1].substring(0, settings.mDec);
            } /** joins the whole number with the deciaml value */
            iv = s + settings.aDec + ivSplit[1];
        } else { /** if whole numbers only */
            iv = s;
        }
        if (settings.aSign) {
            var has_aNeg = iv.indexOf(settings.aNeg) !== -1;
            iv = iv.replace(settings.aNeg, '');
            iv = settings.pSign === 'p' ? settings.aSign + iv : iv + settings.aSign;
            if (has_aNeg) {
                iv = settings.aNeg + iv;
            }
        }
        if (settings.oEvent === 'set' && testNeg < 0 && settings.nBracket !== null) { /** removes the negative sign and places brackets */
            iv = negativeBracket(iv, settings.nBracket, settings.oEvent);
        }
        return iv;
    }
    /**
     * round number after setting by pasting or $().autoNumericSet()
     * private function for round the number
     * please note this handled as text - JavaScript math function can return inaccurate values
     * also this offers multiple rounding methods that are not easily accomplished in JavaScript
     */
    function autoRound(iv, settings) { /** value to string */
        iv = (iv === '') ? '0' : iv.toString();
        convertKeyToNumber(settings, 'mDec'); /** set mDec to number needed when mDec set by 'update method */
        var ivRounded = '',
            i = 0,
            nSign = '',
            rDec = (typeof (settings.aPad) === 'boolean' || settings.aPad === null) ? (settings.aPad ? settings.mDec : 0) : +settings.aPad;
        var truncateZeros = function (ivRounded) { /** truncate not needed zeros */
            var regex = rDec === 0 ? (/(\.[1-9]*)0*$/) : rDec === 1 ? (/(\.\d[1-9]*)0*$/) : new RegExp('(\\.\\d{' + rDec + '}[1-9]*)0*$');
            ivRounded = ivRounded.replace(regex, '$1'); /** If there are no decimal places, we don't need a decimal point at the end */
            if (rDec === 0) {
                ivRounded = ivRounded.replace(/\.$/, '');
            }
            return ivRounded;
        };
        if (iv.charAt(0) === '-') { /** Checks if the iv (input Value)is a negative value */
            nSign = '-'; /** removes the negative sign will be added back later if required */
            iv = iv.replace('-', '');
        } /** prepend a zero if first character is not a digit (then it is likely to be a dot)*/
        if (!iv.match(/^\d/)) {
            iv = '0' + iv;
        } /** determines if the value is zero - if zero no negative sign */
        if (nSign === '-' && +iv === 0) {
            nSign = '';
        }
        if ((+iv > 0 && settings.lZero !== 'keep') || (iv.length > 0 && settings.lZero === 'allow')) { /** trims leading zero's if needed */
            iv = iv.replace(/^0*(\d)/, '$1');
        }
        var dPos = iv.lastIndexOf('.'), /** virtual decimal position */
            vdPos = dPos === -1 ? iv.length - 1 : dPos, /** checks decimal places to determine if rounding is required */
            cDec = (iv.length - 1) - vdPos; /** check if no rounding is required */
        if (cDec <= settings.mDec) {
            ivRounded = iv; /** check if we need to pad with zeros */
            if (cDec < rDec) {
                if (dPos === -1) {
                    ivRounded += '.';
                }
                while (cDec < rDec) {
                    var zeros = '000000'.substring(0, rDec - cDec);
                    ivRounded += zeros;
                    cDec += zeros.length;
                }
            } else if (cDec > rDec) {
                ivRounded = truncateZeros(ivRounded);
            } else if (cDec === 0 && rDec === 0) {
                ivRounded = ivRounded.replace(/\.$/, '');
            }
            return nSign + ivRounded;
        } /** rounded length of the string after rounding */
        var rLength = dPos + settings.mDec, /** test round */
            tRound = +iv.charAt(rLength + 1),
            ivArray = iv.substring(0, rLength + 1).split(''),
            odd = (iv.charAt(rLength) === '.') ? (iv.charAt(rLength - 1) % 2) : (iv.charAt(rLength) % 2);
        if ((tRound > 4 && settings.mRound === 'S') || (tRound > 4 && settings.mRound === 'A' && nSign === '') || (tRound > 5 && settings.mRound === 'A' && nSign === '-') || (tRound > 5 && settings.mRound === 's') || (tRound > 5 && settings.mRound === 'a' && nSign === '') || (tRound > 4 && settings.mRound === 'a' && nSign === '-') || (tRound > 5 && settings.mRound === 'B') || (tRound === 5 && settings.mRound === 'B' && odd === 1) || (tRound > 0 && settings.mRound === 'C' && nSign === '') || (tRound > 0 && settings.mRound === 'F' && nSign === '-') || (tRound > 0 && settings.mRound === 'U')) {
            /** Round up the last digit if required, and continue until no more 9's are found */
            for (i = (ivArray.length - 1); i >= 0; i -= 1) {
                if (ivArray[i] !== '.') {
                    ivArray[i] = +ivArray[i] + 1;
                    if (ivArray[i] < 10) {
                        break;
                    }
                    if (i > 0) {
                        ivArray[i] = '';
                    }
                }
            }
        } /** Reconstruct the string, converting any 10's to 0's */
        ivArray = ivArray.slice(0, rLength + 1);
        ivRounded = truncateZeros(ivArray.join('')); /** return rounded value */
        return (+ivRounded === 0) ? ivRounded : nSign + ivRounded;
    }
    /**
     * Holder object for field properties
     */
    function AutoNumericHolder(that, settings) {
        this.settings = settings;
        this.that = that;
        this.$that = $(that);
        this.formatted = false;
        this.settingsClone = autoCode(this.$that, this.settings);
        this.value = that.value;
    }
    AutoNumericHolder.prototype = {
        init: function (e) {
            this.value = this.that.value;
            this.settingsClone = autoCode(this.$that, this.settings);
            this.ctrlKey = e.ctrlKey;
            this.cmdKey = e.metaKey;
            this.shiftKey = e.shiftKey;
            this.selection = getElementSelection(this.that); /** keypress event overwrites meaningful value of e.keyCode */
            if (e.type === 'keydown' || e.type === 'keyup') {
                this.kdCode = e.keyCode;
            }
            this.which = e.which;
            this.processed = false;
            this.formatted = false;
        },
        setSelection: function (start, end, setReal) {
            start = Math.max(start, 0);
            end = Math.min(end, this.that.value.length);
            this.selection = {
                start: start,
                end: end,
                length: end - start
            };
            if (setReal === undefined || setReal) {
                setElementSelection(this.that, start, end);
            }
        },
        setPosition: function (pos, setReal) {
            this.setSelection(pos, pos, setReal);
        },
        getBeforeAfter: function () {
            var value = this.value,
                left = value.substring(0, this.selection.start),
                right = value.substring(this.selection.end, value.length);
            return [left, right];
        },
        getBeforeAfterStriped: function () {
            var parts = this.getBeforeAfter();
            parts[0] = autoStrip(parts[0], this.settingsClone);
            parts[1] = autoStrip(parts[1], this.settingsClone);
            return parts;
        },
        /**
         * strip parts from excess characters and leading zeroes
         */
        normalizeParts: function (left, right) {
            var settingsClone = this.settingsClone;
            right = autoStrip(right, settingsClone); /** if right is not empty and first character is not aDec, */
            /** we could strip all zeros, otherwise only leading */
            var strip = right.match(/^\d/) ? true : 'leading';
            left = autoStrip(left, settingsClone, strip); /** prevents multiple leading zeros from being entered */
            if ((left === '' || left === settingsClone.aNeg) && settingsClone.lZero === 'deny') {
                if (right > '') {
                    right = right.replace(/^0*(\d)/, '$1');
                }
            }
            var new_value = left + right; /** insert zero if has leading dot */
            if (settingsClone.aDec) {
                var m = new_value.match(new RegExp('^' + settingsClone.aNegRegAutoStrip + '\\' + settingsClone.aDec));
                if (m) {
                    left = left.replace(m[1], m[1] + '0');
                    new_value = left + right;
                }
            } /** insert zero if number is empty and io.wEmpty == 'zero' */
            if (settingsClone.wEmpty === 'zero' && (new_value === settingsClone.aNeg || new_value === '')) {
                left += '0';
            }
            return [left, right];
        },
        /**
         * set part of number to value keeping position of cursor
         */
        setValueParts: function (left, right) {
            var settingsClone = this.settingsClone,
                parts = this.normalizeParts(left, right),
                new_value = parts.join(''),
                position = parts[0].length;
            if (autoCheck(new_value, settingsClone)) {
                new_value = truncateDecimal(new_value, settingsClone.aDec, settingsClone.mDec);
                if (position > new_value.length) {
                    position = new_value.length;
                }
                this.value = new_value;
                this.setPosition(position, false);
                return true;
            }
            return false;
        },
        /**
         * helper function for expandSelectionOnSign
         * returns sign position of a formatted value
         */
        signPosition: function () {
            var settingsClone = this.settingsClone,
                aSign = settingsClone.aSign,
                that = this.that;
            if (aSign) {
                var aSignLen = aSign.length;
                if (settingsClone.pSign === 'p') {
                    var hasNeg = settingsClone.aNeg && that.value && that.value.charAt(0) === settingsClone.aNeg;
                    return hasNeg ? [1, aSignLen + 1] : [0, aSignLen];
                }
                var valueLen = that.value.length;
                return [valueLen - aSignLen, valueLen];
            }
            return [1000, -1];
        },
        /**
         * expands selection to cover whole sign
         * prevents partial deletion/copying/overwriting of a sign
         */
        expandSelectionOnSign: function (setReal) {
            var sign_position = this.signPosition(),
                selection = this.selection;
            if (selection.start < sign_position[1] && selection.end > sign_position[0]) { /** if selection catches something except sign and catches only space from sign */
                if ((selection.start < sign_position[0] || selection.end > sign_position[1]) && this.value.substring(Math.max(selection.start, sign_position[0]), Math.min(selection.end, sign_position[1])).match(/^\s*$/)) { /** then select without empty space */
                    if (selection.start < sign_position[0]) {
                        this.setSelection(selection.start, sign_position[0], setReal);
                    } else {
                        this.setSelection(sign_position[1], selection.end, setReal);
                    }
                } else { /** else select with whole sign */
                    this.setSelection(Math.min(selection.start, sign_position[0]), Math.max(selection.end, sign_position[1]), setReal);
                }
            }
        },
        /**
         * try to strip pasted value to digits
         */
        checkPaste: function () {
            if (this.valuePartsBeforePaste !== undefined) {
                var parts = this.getBeforeAfter(),
                    oldParts = this.valuePartsBeforePaste;
                delete this.valuePartsBeforePaste; /** try to strip pasted value first */
                parts[0] = parts[0].substr(0, oldParts[0].length) + autoStrip(parts[0].substr(oldParts[0].length), this.settingsClone);
                if (!this.setValueParts(parts[0], parts[1])) {
                    this.value = oldParts.join('');
                    this.setPosition(oldParts[0].length, false);
                }
            }
        },
        /**
         * process pasting, cursor moving and skipping of not interesting keys
         * if returns true, futher processing is not performed
         */
        skipAllways: function (e) {
            var kdCode = this.kdCode,
                which = this.which,
                ctrlKey = this.ctrlKey,
                cmdKey = this.cmdKey,
                shiftKey = this.shiftKey; /** catch the ctrl up on ctrl-v */
            if (((ctrlKey || cmdKey) && e.type === 'keyup' && this.valuePartsBeforePaste !== undefined) || (shiftKey && kdCode === 45)) {
                this.checkPaste();
                return false;
            }
            /** codes are taken from http://www.cambiaresearch.com/c4/702b8cd1-e5b0-42e6-83ac-25f0306e3e25/Javascript-Char-Codes-Key-Codes.aspx
             * skip Fx keys, windows keys, other special keys
             */
            if ((kdCode >= 112 && kdCode <= 123) || (kdCode >= 91 && kdCode <= 93) || (kdCode >= 9 && kdCode <= 31) || (kdCode < 8 && (which === 0 || which === kdCode)) || kdCode === 144 || kdCode === 145 || kdCode === 45) {
                return true;
            }
            if ((ctrlKey || cmdKey) && kdCode === 65) { /** if select all (a=65)*/
                return true;
            }
            if ((ctrlKey || cmdKey) && (kdCode === 67 || kdCode === 86 || kdCode === 88)) { /** if copy (c=67) paste (v=86) or cut (x=88) */
                if (e.type === 'keydown') {
                    this.expandSelectionOnSign();
                }
                if (kdCode === 86 || kdCode === 45) { /** try to prevent wrong paste */
                    if (e.type === 'keydown' || e.type === 'keypress') {
                        if (this.valuePartsBeforePaste === undefined) {
                            this.valuePartsBeforePaste = this.getBeforeAfter();
                        }
                    } else {
                        this.checkPaste();
                    }
                }
                return e.type === 'keydown' || e.type === 'keypress' || kdCode === 67;
            }
            if (ctrlKey || cmdKey) {
                return true;
            }
            if (kdCode === 37 || kdCode === 39) { /** jump over thousand separator */
                var aSep = this.settingsClone.aSep,
                    start = this.selection.start,
                    value = this.that.value;
                if (e.type === 'keydown' && aSep && !this.shiftKey) {
                    if (kdCode === 37 && value.charAt(start - 2) === aSep) {
                        this.setPosition(start - 1);
                    } else if (kdCode === 39 && value.charAt(start + 1) === aSep) {
                        this.setPosition(start + 1);
                    }
                }
                return true;
            }
            if (kdCode >= 34 && kdCode <= 40) {
                return true;
            }
            return false;
        },
        /**
         * process deletion of characters
         * returns true if processing performed
         */
        processAllways: function () {
            var parts; /** process backspace or delete */
            if (this.kdCode === 8 || this.kdCode === 46) {
                if (!this.selection.length) {
                    parts = this.getBeforeAfterStriped();
                    if (this.kdCode === 8) {
                        parts[0] = parts[0].substring(0, parts[0].length - 1);
                    } else {
                        parts[1] = parts[1].substring(1, parts[1].length);
                    }
                    this.setValueParts(parts[0], parts[1]);
                } else {
                    this.expandSelectionOnSign(false);
                    parts = this.getBeforeAfterStriped();
                    this.setValueParts(parts[0], parts[1]);
                }
                return true;
            }
            return false;
        },
        /**
         * process insertion of characters
         * returns true if processing performed
         */
        processKeypress: function () {
            var settingsClone = this.settingsClone,
                cCode = String.fromCharCode(this.which),
                parts = this.getBeforeAfterStriped(),
                left = parts[0],
                right = parts[1]; /** start rules when the decimal character key is pressed */
            /** always use numeric pad dot to insert decimal separator */
            if (cCode === settingsClone.aDec || (settingsClone.altDec && cCode === settingsClone.altDec) || ((cCode === '.' || cCode === ',') && this.kdCode === 110)) { /** do not allow decimal character if no decimal part allowed */
                if (!settingsClone.mDec || !settingsClone.aDec) {
                    return true;
                } /** do not allow decimal character before aNeg character */
                if (settingsClone.aNeg && right.indexOf(settingsClone.aNeg) > -1) {
                    return true;
                } /** do not allow decimal character if other decimal character present */
                if (left.indexOf(settingsClone.aDec) > -1) {
                    return true;
                }
                if (right.indexOf(settingsClone.aDec) > 0) {
                    return true;
                }
                if (right.indexOf(settingsClone.aDec) === 0) {
                    right = right.substr(1);
                }
                this.setValueParts(left + settingsClone.aDec, right);
                return true;
            } /** start rule on negative sign */

            if (cCode === '-' || cCode === '+') { /** prevent minus if not allowed */
                if (!settingsClone.aNeg) {
                    return true;
                } /** caret is always after minus */
                if (left === '' && right.indexOf(settingsClone.aNeg) > -1) {
                    left = settingsClone.aNeg;
                    right = right.substring(1, right.length);
                } /** change sign of number, remove part if should */
                if (left.charAt(0) === settingsClone.aNeg) {
                    left = left.substring(1, left.length);
                } else {
                    left = (cCode === '-') ? settingsClone.aNeg + left : left;
                }
                this.setValueParts(left, right);
                return true;
            } /** digits */
            if (cCode >= '0' && cCode <= '9') { /** if try to insert digit before minus */
                if (settingsClone.aNeg && left === '' && right.indexOf(settingsClone.aNeg) > -1) {
                    left = settingsClone.aNeg;
                    right = right.substring(1, right.length);
                }
                if (settingsClone.vMax <= 0 && settingsClone.vMin < settingsClone.vMax && this.value.indexOf(settingsClone.aNeg) === -1 && cCode !== '0') {
                    left = settingsClone.aNeg + left;
                }
                this.setValueParts(left + cCode, right);
                return true;
            } /** prevent any other character */
            return true;
        },
        /**
         * formatting of just processed value with keeping of cursor position
         */
        formatQuick: function () {
            var settingsClone = this.settingsClone,
                parts = this.getBeforeAfterStriped(),
                leftLength = this.value;
            if ((settingsClone.aSep === '' || (settingsClone.aSep !== '' && leftLength.indexOf(settingsClone.aSep) === -1)) && (settingsClone.aSign === '' || (settingsClone.aSign !== '' && leftLength.indexOf(settingsClone.aSign) === -1))) {
                var subParts = [],
                    nSign = '';
                subParts = leftLength.split(settingsClone.aDec);
                if (subParts[0].indexOf('-') > -1) {
                    nSign = '-';
                    subParts[0] = subParts[0].replace('-', '');
                    parts[0] = parts[0].replace('-', '');
                }
                if (subParts[0].length > settingsClone.mInt && parts[0].charAt(0) === '0') { /** strip leading zero if need */
                    parts[0] = parts[0].slice(1);
                }
                parts[0] = nSign + parts[0];
            }
            var value = autoGroup(this.value, this.settingsClone),
                position = value.length;
            if (value) {
                /** prepare regexp which searches for cursor position from unformatted left part */
                var left_ar = parts[0].split(''),
                    i = 0;
                for (i; i < left_ar.length; i += 1) { /** thanks Peter Kovari */
                    if (!left_ar[i].match('\\d')) {
                        left_ar[i] = '\\' + left_ar[i];
                    }
                }
                var leftReg = new RegExp('^.*?' + left_ar.join('.*?'));
                /** search cursor position in formatted value */
                var newLeft = value.match(leftReg);
                if (newLeft) {
                    position = newLeft[0].length;
                    /** if we are just before sign which is in prefix position */
                    if (((position === 0 && value.charAt(0) !== settingsClone.aNeg) || (position === 1 && value.charAt(0) === settingsClone.aNeg)) && settingsClone.aSign && settingsClone.pSign === 'p') {
                        /** place carret after prefix sign */
                        position = this.settingsClone.aSign.length + (value.charAt(0) === '-' ? 1 : 0);
                    }
                } else if (settingsClone.aSign && settingsClone.pSign === 's') {
                    /** if we could not find a place for cursor and have a sign as a suffix */
                    /** place carret before suffix currency sign */
                    position -= settingsClone.aSign.length;
                }
            }
            this.that.value = value;
            this.setPosition(position);
            this.formatted = true;
        }
    };
    /** thanks to Anthony & Evan C */
    function autoGet(obj) {
        if (typeof obj === 'string') {
            obj = obj.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
            obj = '#' + obj.replace(/(:|\.)/g, '\\$1');
            /** obj = '#' + obj.replace(/([;&,\.\+\*\~':"\!\^#$%@\[\]\(\)=>\|])/g, '\\$1'); */
            /** possible modification to replace the above 2 lines */
        }
        return $(obj);
    }

    function getHolder($that, settings, update) {
        var data = $that.data('autoNumeric');
        if (!data) {
            data = {};
            $that.data('autoNumeric', data);
        }
        var holder = data.holder;
        if ((holder === undefined && settings) || update) {
            holder = new AutoNumericHolder($that.get(0), settings);
            data.holder = holder;
        }
        return holder;
    }
    var methods = {
        init: function (options) {
            return this.each(function () {
                var $this = $(this),
                    settings = $this.data('autoNumeric'), /** attempt to grab 'autoNumeric' settings, if they don't exist returns "undefined". */
                    tagData = $this.data(); /** attempt to grab HTML5 data, if they don't exist we'll get "undefined".*/
                if (typeof settings !== 'object') { /** If we couldn't grab settings, create them from defaults and passed options. */
                    var defaults = {
                        /** allowed numeric values
                         * please do not modify
                         */
                        aNum: '0123456789',
                        /** allowed thousand separator characters
                         * comma = ','
                         * period "full stop" = '.'
                         * apostrophe is escaped = '\''
                         * space = ' '
                         * none = ''
                         * NOTE: do not use numeric characters
                         */
                        aSep: ',',
                        /** digital grouping for the thousand separator used in Format
                         * dGroup: '2', results in 99,99,99,999 common in India for values less than 1 billion and greater than -1 billion
                         * dGroup: '3', results in 999,999,999 default
                         * dGroup: '4', results in 9999,9999,9999 used in some Asian countries
                         */
                        dGroup: '3',
                        /** allowed decimal separator characters
                         * period "full stop" = '.'
                         * comma = ','
                         */
                        aDec: '.',
                        /** allow to declare alternative decimal separator which is automatically replaced by aDec
                         * developed for countries the use a comma ',' as the decimal character
                         * and have keyboards\numeric pads that have a period 'full stop' as the decimal characters (Spain is an example)
                         */
                        altDec: null,
                        /** allowed currency symbol
                         * Must be in quotes aSign: '$', a space is allowed aSign: '$ '
                         */
                        aSign: '',
                        /** placement of currency sign
                         * for prefix pSign: 'p',
                         * for suffix pSign: 's',
                         */
                        pSign: 'p',
                        /** maximum possible value
                         * value must be enclosed in quotes and use the period for the decimal point
                         * value must be larger than vMin
                         */
                        vMax: '999999999.99',
                        /** minimum possible value
                         * value must be enclosed in quotes and use the period for the decimal point
                         * value must be smaller than vMax
                         */
                        vMin: '0.00',
                        /** max number of decimal places = used to override decimal places set by the vMin & vMax values
                         * value must be enclosed in quotes example mDec: '3',
                         * This can also set the value via a call back function mDec: 'css:#
                         */
                        mDec: null,
                        /** method used for rounding
                         * mRound: 'S', Round-Half-Up Symmetric (default)
                         * mRound: 'A', Round-Half-Up Asymmetric
                         * mRound: 's', Round-Half-Down Symmetric (lower case s)
                         * mRound: 'a', Round-Half-Down Asymmetric (lower case a)
                         * mRound: 'B', Round-Half-Even "Bankers Rounding"
                         * mRound: 'U', Round Up "Round-Away-From-Zero"
                         * mRound: 'D', Round Down "Round-Toward-Zero" - same as truncate
                         * mRound: 'C', Round to Ceiling "Toward Positive Infinity"
                         * mRound: 'F', Round to Floor "Toward Negative Infinity"
                         */
                        mRound: 'S',
                        /** controls decimal padding
                         * aPad: true - always Pad decimals with zeros
                         * aPad: false - does not pad with zeros.
                         * aPad: `some number` - pad decimals with zero to number different from mDec
                         * thanks to Jonas Johansson for the suggestion
                         */
                        aPad: true,
                        /** places brackets on negative value -$ 999.99 to (999.99)
                         * visible only when the field does NOT have focus the left and right symbols should be enclosed in quotes and seperated by a comma
                         * nBracket: null, nBracket: '(,)', nBracket: '[,]', nBracket: '<,>' or nBracket: '{,}'
                         */
                        nBracket: null,
                        /** Displayed on empty string
                         * wEmpty: 'empty', - input can be blank
                         * wEmpty: 'zero', - displays zero
                         * wEmpty: 'sign', - displays the currency sign
                         */
                        wEmpty: 'empty',
                        /** controls leading zero behavior
                         * lZero: 'allow', - allows leading zeros to be entered. Zeros will be truncated when entering additional digits. On focusout zeros will be deleted.
                         * lZero: 'deny', - allows only one leading zero on values less than one
                         * lZero: 'keep', - allows leading zeros to be entered. on fousout zeros will be retained.
                         */
                        lZero: 'allow',
                        /** determine if the default value will be formatted on page ready.
                         * true = automatically formats the default value on page ready
                         * false = will not format the default value
                         */
                        aForm: true,
                        /** future use */
                        onSomeEvent: function () {}
                    };
                    settings = $.extend({}, defaults, tagData, options); /** Merge defaults, tagData and options */
                    if (settings.aDec === settings.aSep) {
                        $.error("autoNumeric will not function properly when the decimal character aDec: '" + settings.aDec + "' and thousand separator aSep: '" + settings.aSep + "' are the same character");
                        return this;
                    }
                    $this.data('autoNumeric', settings); /** Save our new settings */
                } else {
                    return this;
                }
                settings.lastSetValue = '';
                settings.runOnce = false;
                var holder = getHolder($this, settings);
                if ($.inArray($this.prop('tagName'), settings.tagList) === -1 && $this.prop('tagName') !== 'INPUT') {
                    $.error("The <" + $this.prop('tagName') + "> is not supported by autoNumeric()");
                    return this;
                }
                if (settings.runOnce === false && settings.aForm) {/** routine to format default value on page load */
                    if ($this.is('input[type=text], input[type=hidden], input:not([type])')) {
                        var setValue = true;
                        if ($this[0].value === '' && settings.wEmpty === 'empty') {
                            $this[0].value = '';
                            setValue = false;
                        }
                        if ($this[0].value === '' && settings.wEmpty === 'sign') {
                            $this[0].value = settings.aSign;
                            setValue = false;
                        }
                        if (setValue) {
                            $this.autoNumeric('set', $this.val());
                        }
                    }
                    if ($.inArray($this.prop('tagName'), settings.tagList) !== -1 && $this.text() !== '') {
                        $this.autoNumeric('set', $this.text());
                    }
                }
                settings.runOnce = true;
                if ($this.is('input[type=text], input[type=hidden], input:not([type])')) { /**added hidden type */
                    $this.on('keydown.autoNumeric', function (e) {
                        holder = getHolder($this);
                        if (holder.settings.aDec === holder.settings.aSep) {
                            $.error("autoNumeric will not function properly when the decimal character aDec: '" + holder.settings.aDec + "' and thousand separator aSep: '" + holder.settings.aSep + "' are the same character");
                            return this;
                        }
                        if (holder.that.readOnly) {
                            holder.processed = true;
                            return true;
                        }
                        /** The below streamed code / comment allows the "enter" keydown to throw a change() event */
                        /** if (e.keyCode === 13 && holder.inVal !== $this.val()){
                            $this.change();
                            holder.inVal = $this.val();
                        }*/
                        holder.init(e);
                        holder.settings.oEvent = 'keydown';
                        if (holder.skipAllways(e)) {
                            holder.processed = true;
                            return true;
                        }
                        if (holder.processAllways()) {
                            holder.processed = true;
                            holder.formatQuick();
                            e.preventDefault();
                            return false;
                        }
                        holder.formatted = false;
                        return true;
                    });
                    $this.on('keypress.autoNumeric', function (e) {
                        var holder = getHolder($this),
                            processed = holder.processed;
                        holder.init(e);
                        holder.settings.oEvent = 'keypress';
                        if (holder.skipAllways(e)) {
                            return true;
                        }
                        if (processed) {
                            e.preventDefault();
                            return false;
                        }
                        if (holder.processAllways() || holder.processKeypress()) {
                            holder.formatQuick();
                            e.preventDefault();
                            return false;
                        }
                        holder.formatted = false;
                    });
                    $this.on('keyup.autoNumeric', function (e) {
                        var holder = getHolder($this);
                        holder.init(e);
                        holder.settings.oEvent = 'keyup';
                        var skip = holder.skipAllways(e);
                        holder.kdCode = 0;
                        delete holder.valuePartsBeforePaste;
                        if ($this[0].value === holder.settings.aSign) { /** added to properly place the caret when only the currency is present */
                            if (holder.settings.pSign === 's') {
                                setElementSelection(this, 0, 0);
                            } else {
                                setElementSelection(this, holder.settings.aSign.length, holder.settings.aSign.length);
                            }
                        }
                        if (skip) {
                            return true;
                        }
                        if (this.value === '') {
                            return true;
                        }
                        if (!holder.formatted) {
                            holder.formatQuick();
                        }
                    });
                    $this.on('focusin.autoNumeric', function () {
                        var holder = getHolder($this);
                        holder.settingsClone.oEvent = 'focusin';
                        if (holder.settingsClone.nBracket !== null) {
                            var checkVal = $this.val();
                            $this.val(negativeBracket(checkVal, holder.settingsClone.nBracket, holder.settingsClone.oEvent));
                        }
                        holder.inVal = $this.val();
                        var onempty = checkEmpty(holder.inVal, holder.settingsClone, true);
                        if (onempty !== null) {
                            $this.val(onempty);
                            if (holder.settings.pSign === 's') {
                                setElementSelection(this, 0, 0);
                            } else {
                                setElementSelection(this, holder.settings.aSign.length, holder.settings.aSign.length);
                            }
                        }
                    });
                    $this.on('focusout.autoNumeric', function () {
                        var holder = getHolder($this),
                            settingsClone = holder.settingsClone,
                            value = $this.val(),
                            origValue = value;
                        holder.settingsClone.oEvent = 'focusout';
                        var strip_zero = ''; /** added to control leading zero */
                        if (settingsClone.lZero === 'allow') { /** added to control leading zero */
                            settingsClone.allowLeading = false;
                            strip_zero = 'leading';
                        }
                        if (value !== '') {
                            value = autoStrip(value, settingsClone, strip_zero);
                            if (checkEmpty(value, settingsClone) === null && autoCheck(value, settingsClone, $this[0])) {
                                value = fixNumber(value, settingsClone.aDec, settingsClone.aNeg);
                                value = autoRound(value, settingsClone);
                                value = presentNumber(value, settingsClone.aDec, settingsClone.aNeg);
                            } else {
                                value = '';
                            }
                        }
                        var groupedValue = checkEmpty(value, settingsClone, false);
                        if (groupedValue === null) {
                            groupedValue = autoGroup(value, settingsClone);
                        }
                        if (groupedValue !== origValue) {
                            $this.val(groupedValue);
                        }
                        if (groupedValue !== holder.inVal) {
                            $this.change();
                            delete holder.inVal;
                        }
                        if (settingsClone.nBracket !== null && $this.autoNumeric('get') < 0) {
                            holder.settingsClone.oEvent = 'focusout';
                            $this.val(negativeBracket($this.val(), settingsClone.nBracket, settingsClone.oEvent));
                        }
                    });
                }
            });
        },
        /** method to remove settings and stop autoNumeric() */
        destroy: function () {
            return $(this).each(function () {
                var $this = $(this);
                $this.off('.autoNumeric');
                $this.removeData('autoNumeric');
            });
        },
        /** method to update settings - can call as many times */
        update: function (options) {
            return $(this).each(function () {
                var $this = autoGet($(this)),
                    settings = $this.data('autoNumeric');
                if (typeof settings !== 'object') {
                    $.error("You must initialize autoNumeric('init', {options}) prior to calling the 'update' method");
                    return this;
                }
                var strip = $this.autoNumeric('get');
                settings = $.extend(settings, options);
                getHolder($this, settings, true);
                if (settings.aDec === settings.aSep) {
                    $.error("autoNumeric will not function properly when the decimal character aDec: '" + settings.aDec + "' and thousand separator aSep: '" + settings.aSep + "' are the same character");
                    return this;
                }
                $this.data('autoNumeric', settings);
                if ($this.val() !== '' || $this.text() !== '') {
                    return $this.autoNumeric('set', strip);
                }
                return;
            });
        },
        /** returns a formatted strings for "input:text" fields Uses jQuery's .val() method*/
        set: function (valueIn) {
            return $(this).each(function () {
                var $this = autoGet($(this)),
                    settings = $this.data('autoNumeric'),
                    value = valueIn.toString(),
                    testValue = valueIn.toString();
                if (typeof settings !== 'object') {
                    $.error("You must initialize autoNumeric('init', {options}) prior to calling the 'set' method");
                    return this;
                }
               /** allows locale decimal separator to be a comma */
                if ((testValue === $this.attr('value') || testValue === $this.text()) && settings.runOnce === false) {
                    value = value.replace(',', '.');
                }
                /** routine to handle page re-load from back button */
                if (testValue !== $this.attr('value') && $this.prop('tagName') === 'INPUT' && settings.runOnce === false) {
                    value = autoStrip(value, settings);
                }
                /** returns a empty string if the value being 'set' contains non-numeric characters and or more than decimal point (full stop) and will not be formatted */
                if (!$.isNumeric(+value)) {
                    return '';
                }
                value = checkValue(value, settings);
                settings.oEvent = 'set';
                settings.lastSetValue = value; /** saves the unrounded value from the set method - $('selector').data('autoNumeric').lastSetValue; - helpful when you need to change the rounding accuracy*/
                value.toString();
                if (value !== '') {
                    value = autoRound(value, settings);
                }
                value = presentNumber(value, settings.aDec, settings.aNeg);
                if (!autoCheck(value, settings)) {
                    value = autoRound('', settings);
                }
                value = autoGroup(value, settings);
                if ($this.is('input[type=text], input[type=hidden], input:not([type])')) { /**added hidden type */
                    return $this.val(value);
                }
                if ($.inArray($this.prop('tagName'), settings.tagList) !== -1) {
                    return $this.text(value);
                }
                $.error("The <" + $this.prop('tagName') + "> is not supported by autoNumeric()");
                return false;
            });
        },
        /** method to get the unformatted value from a specific input field, returns a numeric value */
        get: function () {
            var $this = autoGet($(this)),
                settings = $this.data('autoNumeric');
            if (typeof settings !== 'object') {
                $.error("You must initialize autoNumeric('init', {options}) prior to calling the 'get' method");
                return this;
            }
            settings.oEvent = 'get';
            var getValue = '';
            /** determine the element type then use .eq(0) selector to grab the value of the first element in selector */
            if ($this.is('input[type=text], input[type=hidden], input:not([type])')) { /**added hidden type */
                getValue = $this.eq(0).val();
            } else if ($.inArray($this.prop('tagName'), settings.tagList) !== -1) {
                getValue = $this.eq(0).text();
            } else {
                $.error("The <" + $this.prop('tagName') + "> is not supported by autoNumeric()");
                return false;
            }
            if ((getValue === '' && settings.wEmpty === 'empty') || (getValue === settings.aSign && (settings.wEmpty === 'sign' || settings.wEmpty === 'empty'))) {
                return '';
            }
            if (settings.nBracket !== null && getValue !== '') {
                getValue = negativeBracket(getValue, settings.nBracket, settings.oEvent);
            }
            if (settings.runOnce || settings.aForm === false) {
                getValue = autoStrip(getValue, settings);
            }
            getValue = fixNumber(getValue, settings.aDec, settings.aNeg);
            if (+getValue === 0 && settings.lZero !== 'keep') {
                getValue = '0';
            }
            if (settings.lZero === 'keep') {
                return getValue;
            }
            getValue = checkValue(getValue, settings);
            return getValue; /** returned Numeric String */
        },
        /** method to get the unformatted value from multiple fields */
        getString: function () {
            var isAutoNumeric = false,
                $this = autoGet($(this)),
                str = $this.serialize(),
                parts = str.split('&'),
                i = 0;
            for (i; i < parts.length; i += 1) {
                var miniParts = parts[i].split('=');
                var settings = $('*[name="' + decodeURIComponent(miniParts[0]) + '"]').data('autoNumeric');
                if (typeof settings === 'object') {
                    if (miniParts[1] !== null && $('*[name="' + decodeURIComponent(miniParts[0]) + '"]').data('autoNumeric') !== undefined) {
                        miniParts[1] = $('input[name="' + decodeURIComponent(miniParts[0]) + '"]').autoNumeric('get');
                        parts[i] = miniParts.join('=');
                        isAutoNumeric = true;
                    }
                }
            }
            if (isAutoNumeric === true) {
                return parts.join('&');
            }
            $.error("You must initialize autoNumeric('init', {options}) prior to calling the 'getString' method");
            return this;
        },
        /** method to get the unformatted value from multiple fields */
        getArray: function () {
            var isAutoNumeric = false,
                $this = autoGet($(this)),
                formFields = $this.serializeArray();
            $.each(formFields, function (i, field) {
                var settings = $('*[name="' + decodeURIComponent(field.name) + '"]').data('autoNumeric');
                if (typeof settings === 'object') {
                    if (field.value !== '' && $('*[name="' + decodeURIComponent(field.name) + '"]').data('autoNumeric') !== undefined) {
                        field.value = $('input[name="' + decodeURIComponent(field.name) + '"]').autoNumeric('get').toString();
                    }
                    isAutoNumeric = true;
                }
            });
            if (isAutoNumeric === true) {
                return formFields;
            }
            $.error("You must initialize autoNumeric('init', {options}) prior to calling the 'getArray' method");
            return this;
        },
        /** returns the settings object for those who need to look under the hood */
        getSettings: function () {
            var $this = autoGet($(this));
            return $this.eq(0).data('autoNumeric');
        }
    };
    $.fn.autoNumeric = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        }
        if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        }
        $.error('Method "' + method + '" is not supported by autoNumeric()');
    };
}(jQuery));



/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache 
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/js/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/form-json/dist/index.js":
/*!**********************************************!*\
  !*** ./node_modules/form-json/dist/index.js ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
function e(e){return e&&"object"==typeof e&&"default"in e?e.default:e}var n=e(__webpack_require__(/*! get-value */ "./node_modules/form-json/node_modules/get-value/index.js")),t=e(__webpack_require__(/*! set-value */ "./node_modules/form-json/node_modules/set-value/index.js")),r=["number","range"],u=["month","date"];function a(e,r){var u=r.name,a=r.value,c=n(e,u);return c?c instanceof Array?c.push(a):t(e,u,[c,a]):t(e,u,a),e}module.exports=function(e){return function(e){for(var n=[],t=e.elements,a=t.length,c=0;c<a;++c){var i=t.item(c),o=i.name,l=i.value,f=i.type,s=i.checked;"checkbox"===f&&(l=!!s),("radio"!==f||s)&&(r.includes(f)&&(l=parseFloat(l)),u.includes(f)&&(l=new Date(l)),n.push({name:o,value:l,type:f,checked:s}))}return n}(e).filter((function(e){return e.name})).reduce(a,{})};


/***/ }),

/***/ "./node_modules/form-json/node_modules/get-value/index.js":
/*!****************************************************************!*\
  !*** ./node_modules/form-json/node_modules/get-value/index.js ***!
  \****************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/*!
 * get-value <https://github.com/jonschlinkert/get-value>
 *
 * Copyright (c) 2014-2018, Jon Schlinkert.
 * Released under the MIT License.
 */

const isObject = __webpack_require__(/*! isobject */ "./node_modules/isobject/index.js");

module.exports = function(target, path, options) {
  if (!isObject(options)) {
    options = { default: options };
  }

  if (!isValidObject(target)) {
    return typeof options.default !== 'undefined' ? options.default : target;
  }

  if (typeof path === 'number') {
    path = String(path);
  }

  const isArray = Array.isArray(path);
  const isString = typeof path === 'string';
  const splitChar = options.separator || '.';
  const joinChar = options.joinChar || (typeof splitChar === 'string' ? splitChar : '.');

  if (!isString && !isArray) {
    return target;
  }

  if (isString && path in target) {
    return isValid(path, target, options) ? target[path] : options.default;
  }

  let segs = isArray ? path : split(path, splitChar, options);
  let len = segs.length;
  let idx = 0;

  do {
    let prop = segs[idx];
    if (typeof prop === 'number') {
      prop = String(prop);
    }

    while (prop && prop.slice(-1) === '\\') {
      prop = join([prop.slice(0, -1), segs[++idx] || ''], joinChar, options);
    }

    if (prop in target) {
      if (!isValid(prop, target, options)) {
        return options.default;
      }

      target = target[prop];
    } else {
      let hasProp = false;
      let n = idx + 1;

      while (n < len) {
        prop = join([prop, segs[n++]], joinChar, options);

        if ((hasProp = prop in target)) {
          if (!isValid(prop, target, options)) {
            return options.default;
          }

          target = target[prop];
          idx = n - 1;
          break;
        }
      }

      if (!hasProp) {
        return options.default;
      }
    }
  } while (++idx < len && isValidObject(target));

  if (idx === len) {
    return target;
  }

  return options.default;
};

function join(segs, joinChar, options) {
  if (typeof options.join === 'function') {
    return options.join(segs);
  }
  return segs[0] + joinChar + segs[1];
}

function split(path, splitChar, options) {
  if (typeof options.split === 'function') {
    return options.split(path);
  }
  return path.split(splitChar);
}

function isValid(key, target, options) {
  if (typeof options.isValid === 'function') {
    return options.isValid(key, target);
  }
  return true;
}

function isValidObject(val) {
  return isObject(val) || Array.isArray(val) || typeof val === 'function';
}


/***/ }),

/***/ "./node_modules/form-json/node_modules/set-value/index.js":
/*!****************************************************************!*\
  !*** ./node_modules/form-json/node_modules/set-value/index.js ***!
  \****************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * set-value <https://github.com/jonschlinkert/set-value>
 *
 * Copyright (c) 2014-2018, Jon Schlinkert.
 * Released under the MIT License.
 */



const isPlain = __webpack_require__(/*! is-plain-object */ "./node_modules/is-plain-object/index.js");

function set(target, path, value, options) {
  if (!isObject(target)) {
    return target;
  }

  let opts = options || {};
  const isArray = Array.isArray(path);
  if (!isArray && typeof path !== 'string') {
    return target;
  }

  let merge = opts.merge;
  if (merge && typeof merge !== 'function') {
    merge = Object.assign;
  }

  const keys = (isArray ? path : split(path, opts)).filter(isValidKey);
  const len = keys.length;
  const orig = target;

  if (!options && keys.length === 1) {
    result(target, keys[0], value, merge);
    return target;
  }

  for (let i = 0; i < len; i++) {
    let prop = keys[i];

    if (!isObject(target[prop])) {
      target[prop] = {};
    }

    if (i === len - 1) {
      result(target, prop, value, merge);
      break;
    }

    target = target[prop];
  }

  return orig;
}

function result(target, path, value, merge) {
  if (merge && isPlain(target[path]) && isPlain(value)) {
    target[path] = merge({}, target[path], value);
  } else {
    target[path] = value;
  }
}

function split(path, options) {
  const id = createKey(path, options);
  if (set.memo[id]) return set.memo[id];

  const char = (options && options.separator) ? options.separator : '.';
  let keys = [];
  let res = [];

  if (options && typeof options.split === 'function') {
    keys = options.split(path);
  } else {
    keys = path.split(char);
  }

  for (let i = 0; i < keys.length; i++) {
    let prop = keys[i];
    while (prop && prop.slice(-1) === '\\' && keys[i + 1] != null) {
      prop = prop.slice(0, -1) + char + keys[++i];
    }
    res.push(prop);
  }
  set.memo[id] = res;
  return res;
}

function createKey(pattern, options) {
  let id = pattern;
  if (typeof options === 'undefined') {
    return id + '';
  }
  const keys = Object.keys(options);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    id += ';' + key + '=' + String(options[key]);
  }
  return id;
}

function isValidKey(key) {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

function isObject(val) {
  return val !== null && (typeof val === 'object' || typeof val === 'function');
}

set.memo = {};
module.exports = set;


/***/ }),

/***/ "./node_modules/intersection-observer/intersection-observer.js":
/*!*********************************************************************!*\
  !*** ./node_modules/intersection-observer/intersection-observer.js ***!
  \*********************************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

/**
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the W3C SOFTWARE AND DOCUMENT NOTICE AND LICENSE.
 *
 *  https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
 *
 */
(function() {
'use strict';

// Exit early if we're not running in a browser.
if (typeof window !== 'object') {
  return;
}

// Exit early if all IntersectionObserver and IntersectionObserverEntry
// features are natively supported.
if ('IntersectionObserver' in window &&
    'IntersectionObserverEntry' in window &&
    'intersectionRatio' in window.IntersectionObserverEntry.prototype) {

  // Minimal polyfill for Edge 15's lack of `isIntersecting`
  // See: https://github.com/w3c/IntersectionObserver/issues/211
  if (!('isIntersecting' in window.IntersectionObserverEntry.prototype)) {
    Object.defineProperty(window.IntersectionObserverEntry.prototype,
      'isIntersecting', {
      get: function () {
        return this.intersectionRatio > 0;
      }
    });
  }
  return;
}


/**
 * A local reference to the document.
 */
var document = window.document;


/**
 * An IntersectionObserver registry. This registry exists to hold a strong
 * reference to IntersectionObserver instances currently observing a target
 * element. Without this registry, instances without another reference may be
 * garbage collected.
 */
var registry = [];


/**
 * Creates the global IntersectionObserverEntry constructor.
 * https://w3c.github.io/IntersectionObserver/#intersection-observer-entry
 * @param {Object} entry A dictionary of instance properties.
 * @constructor
 */
function IntersectionObserverEntry(entry) {
  this.time = entry.time;
  this.target = entry.target;
  this.rootBounds = entry.rootBounds;
  this.boundingClientRect = entry.boundingClientRect;
  this.intersectionRect = entry.intersectionRect || getEmptyRect();
  this.isIntersecting = !!entry.intersectionRect;

  // Calculates the intersection ratio.
  var targetRect = this.boundingClientRect;
  var targetArea = targetRect.width * targetRect.height;
  var intersectionRect = this.intersectionRect;
  var intersectionArea = intersectionRect.width * intersectionRect.height;

  // Sets intersection ratio.
  if (targetArea) {
    // Round the intersection ratio to avoid floating point math issues:
    // https://github.com/w3c/IntersectionObserver/issues/324
    this.intersectionRatio = Number((intersectionArea / targetArea).toFixed(4));
  } else {
    // If area is zero and is intersecting, sets to 1, otherwise to 0
    this.intersectionRatio = this.isIntersecting ? 1 : 0;
  }
}


/**
 * Creates the global IntersectionObserver constructor.
 * https://w3c.github.io/IntersectionObserver/#intersection-observer-interface
 * @param {Function} callback The function to be invoked after intersection
 *     changes have queued. The function is not invoked if the queue has
 *     been emptied by calling the `takeRecords` method.
 * @param {Object=} opt_options Optional configuration options.
 * @constructor
 */
function IntersectionObserver(callback, opt_options) {

  var options = opt_options || {};

  if (typeof callback != 'function') {
    throw new Error('callback must be a function');
  }

  if (options.root && options.root.nodeType != 1) {
    throw new Error('root must be an Element');
  }

  // Binds and throttles `this._checkForIntersections`.
  this._checkForIntersections = throttle(
      this._checkForIntersections.bind(this), this.THROTTLE_TIMEOUT);

  // Private properties.
  this._callback = callback;
  this._observationTargets = [];
  this._queuedEntries = [];
  this._rootMarginValues = this._parseRootMargin(options.rootMargin);

  // Public properties.
  this.thresholds = this._initThresholds(options.threshold);
  this.root = options.root || null;
  this.rootMargin = this._rootMarginValues.map(function(margin) {
    return margin.value + margin.unit;
  }).join(' ');
}


/**
 * The minimum interval within which the document will be checked for
 * intersection changes.
 */
IntersectionObserver.prototype.THROTTLE_TIMEOUT = 100;


/**
 * The frequency in which the polyfill polls for intersection changes.
 * this can be updated on a per instance basis and must be set prior to
 * calling `observe` on the first target.
 */
IntersectionObserver.prototype.POLL_INTERVAL = null;

/**
 * Use a mutation observer on the root element
 * to detect intersection changes.
 */
IntersectionObserver.prototype.USE_MUTATION_OBSERVER = true;


/**
 * Starts observing a target element for intersection changes based on
 * the thresholds values.
 * @param {Element} target The DOM element to observe.
 */
IntersectionObserver.prototype.observe = function(target) {
  var isTargetAlreadyObserved = this._observationTargets.some(function(item) {
    return item.element == target;
  });

  if (isTargetAlreadyObserved) {
    return;
  }

  if (!(target && target.nodeType == 1)) {
    throw new Error('target must be an Element');
  }

  this._registerInstance();
  this._observationTargets.push({element: target, entry: null});
  this._monitorIntersections();
  this._checkForIntersections();
};


/**
 * Stops observing a target element for intersection changes.
 * @param {Element} target The DOM element to observe.
 */
IntersectionObserver.prototype.unobserve = function(target) {
  this._observationTargets =
      this._observationTargets.filter(function(item) {

    return item.element != target;
  });
  if (!this._observationTargets.length) {
    this._unmonitorIntersections();
    this._unregisterInstance();
  }
};


/**
 * Stops observing all target elements for intersection changes.
 */
IntersectionObserver.prototype.disconnect = function() {
  this._observationTargets = [];
  this._unmonitorIntersections();
  this._unregisterInstance();
};


/**
 * Returns any queue entries that have not yet been reported to the
 * callback and clears the queue. This can be used in conjunction with the
 * callback to obtain the absolute most up-to-date intersection information.
 * @return {Array} The currently queued entries.
 */
IntersectionObserver.prototype.takeRecords = function() {
  var records = this._queuedEntries.slice();
  this._queuedEntries = [];
  return records;
};


/**
 * Accepts the threshold value from the user configuration object and
 * returns a sorted array of unique threshold values. If a value is not
 * between 0 and 1 and error is thrown.
 * @private
 * @param {Array|number=} opt_threshold An optional threshold value or
 *     a list of threshold values, defaulting to [0].
 * @return {Array} A sorted list of unique and valid threshold values.
 */
IntersectionObserver.prototype._initThresholds = function(opt_threshold) {
  var threshold = opt_threshold || [0];
  if (!Array.isArray(threshold)) threshold = [threshold];

  return threshold.sort().filter(function(t, i, a) {
    if (typeof t != 'number' || isNaN(t) || t < 0 || t > 1) {
      throw new Error('threshold must be a number between 0 and 1 inclusively');
    }
    return t !== a[i - 1];
  });
};


/**
 * Accepts the rootMargin value from the user configuration object
 * and returns an array of the four margin values as an object containing
 * the value and unit properties. If any of the values are not properly
 * formatted or use a unit other than px or %, and error is thrown.
 * @private
 * @param {string=} opt_rootMargin An optional rootMargin value,
 *     defaulting to '0px'.
 * @return {Array<Object>} An array of margin objects with the keys
 *     value and unit.
 */
IntersectionObserver.prototype._parseRootMargin = function(opt_rootMargin) {
  var marginString = opt_rootMargin || '0px';
  var margins = marginString.split(/\s+/).map(function(margin) {
    var parts = /^(-?\d*\.?\d+)(px|%)$/.exec(margin);
    if (!parts) {
      throw new Error('rootMargin must be specified in pixels or percent');
    }
    return {value: parseFloat(parts[1]), unit: parts[2]};
  });

  // Handles shorthand.
  margins[1] = margins[1] || margins[0];
  margins[2] = margins[2] || margins[0];
  margins[3] = margins[3] || margins[1];

  return margins;
};


/**
 * Starts polling for intersection changes if the polling is not already
 * happening, and if the page's visibility state is visible.
 * @private
 */
IntersectionObserver.prototype._monitorIntersections = function() {
  if (!this._monitoringIntersections) {
    this._monitoringIntersections = true;

    // If a poll interval is set, use polling instead of listening to
    // resize and scroll events or DOM mutations.
    if (this.POLL_INTERVAL) {
      this._monitoringInterval = setInterval(
          this._checkForIntersections, this.POLL_INTERVAL);
    }
    else {
      addEvent(window, 'resize', this._checkForIntersections, true);
      addEvent(document, 'scroll', this._checkForIntersections, true);

      if (this.USE_MUTATION_OBSERVER && 'MutationObserver' in window) {
        this._domObserver = new MutationObserver(this._checkForIntersections);
        this._domObserver.observe(document, {
          attributes: true,
          childList: true,
          characterData: true,
          subtree: true
        });
      }
    }
  }
};


/**
 * Stops polling for intersection changes.
 * @private
 */
IntersectionObserver.prototype._unmonitorIntersections = function() {
  if (this._monitoringIntersections) {
    this._monitoringIntersections = false;

    clearInterval(this._monitoringInterval);
    this._monitoringInterval = null;

    removeEvent(window, 'resize', this._checkForIntersections, true);
    removeEvent(document, 'scroll', this._checkForIntersections, true);

    if (this._domObserver) {
      this._domObserver.disconnect();
      this._domObserver = null;
    }
  }
};


/**
 * Scans each observation target for intersection changes and adds them
 * to the internal entries queue. If new entries are found, it
 * schedules the callback to be invoked.
 * @private
 */
IntersectionObserver.prototype._checkForIntersections = function() {
  var rootIsInDom = this._rootIsInDom();
  var rootRect = rootIsInDom ? this._getRootRect() : getEmptyRect();

  this._observationTargets.forEach(function(item) {
    var target = item.element;
    var targetRect = getBoundingClientRect(target);
    var rootContainsTarget = this._rootContainsTarget(target);
    var oldEntry = item.entry;
    var intersectionRect = rootIsInDom && rootContainsTarget &&
        this._computeTargetAndRootIntersection(target, rootRect);

    var newEntry = item.entry = new IntersectionObserverEntry({
      time: now(),
      target: target,
      boundingClientRect: targetRect,
      rootBounds: rootRect,
      intersectionRect: intersectionRect
    });

    if (!oldEntry) {
      this._queuedEntries.push(newEntry);
    } else if (rootIsInDom && rootContainsTarget) {
      // If the new entry intersection ratio has crossed any of the
      // thresholds, add a new entry.
      if (this._hasCrossedThreshold(oldEntry, newEntry)) {
        this._queuedEntries.push(newEntry);
      }
    } else {
      // If the root is not in the DOM or target is not contained within
      // root but the previous entry for this target had an intersection,
      // add a new record indicating removal.
      if (oldEntry && oldEntry.isIntersecting) {
        this._queuedEntries.push(newEntry);
      }
    }
  }, this);

  if (this._queuedEntries.length) {
    this._callback(this.takeRecords(), this);
  }
};


/**
 * Accepts a target and root rect computes the intersection between then
 * following the algorithm in the spec.
 * TODO(philipwalton): at this time clip-path is not considered.
 * https://w3c.github.io/IntersectionObserver/#calculate-intersection-rect-algo
 * @param {Element} target The target DOM element
 * @param {Object} rootRect The bounding rect of the root after being
 *     expanded by the rootMargin value.
 * @return {?Object} The final intersection rect object or undefined if no
 *     intersection is found.
 * @private
 */
IntersectionObserver.prototype._computeTargetAndRootIntersection =
    function(target, rootRect) {

  // If the element isn't displayed, an intersection can't happen.
  if (window.getComputedStyle(target).display == 'none') return;

  var targetRect = getBoundingClientRect(target);
  var intersectionRect = targetRect;
  var parent = getParentNode(target);
  var atRoot = false;

  while (!atRoot) {
    var parentRect = null;
    var parentComputedStyle = parent.nodeType == 1 ?
        window.getComputedStyle(parent) : {};

    // If the parent isn't displayed, an intersection can't happen.
    if (parentComputedStyle.display == 'none') return;

    if (parent == this.root || parent == document) {
      atRoot = true;
      parentRect = rootRect;
    } else {
      // If the element has a non-visible overflow, and it's not the <body>
      // or <html> element, update the intersection rect.
      // Note: <body> and <html> cannot be clipped to a rect that's not also
      // the document rect, so no need to compute a new intersection.
      if (parent != document.body &&
          parent != document.documentElement &&
          parentComputedStyle.overflow != 'visible') {
        parentRect = getBoundingClientRect(parent);
      }
    }

    // If either of the above conditionals set a new parentRect,
    // calculate new intersection data.
    if (parentRect) {
      intersectionRect = computeRectIntersection(parentRect, intersectionRect);

      if (!intersectionRect) break;
    }
    parent = getParentNode(parent);
  }
  return intersectionRect;
};


/**
 * Returns the root rect after being expanded by the rootMargin value.
 * @return {Object} The expanded root rect.
 * @private
 */
IntersectionObserver.prototype._getRootRect = function() {
  var rootRect;
  if (this.root) {
    rootRect = getBoundingClientRect(this.root);
  } else {
    // Use <html>/<body> instead of window since scroll bars affect size.
    var html = document.documentElement;
    var body = document.body;
    rootRect = {
      top: 0,
      left: 0,
      right: html.clientWidth || body.clientWidth,
      width: html.clientWidth || body.clientWidth,
      bottom: html.clientHeight || body.clientHeight,
      height: html.clientHeight || body.clientHeight
    };
  }
  return this._expandRectByRootMargin(rootRect);
};


/**
 * Accepts a rect and expands it by the rootMargin value.
 * @param {Object} rect The rect object to expand.
 * @return {Object} The expanded rect.
 * @private
 */
IntersectionObserver.prototype._expandRectByRootMargin = function(rect) {
  var margins = this._rootMarginValues.map(function(margin, i) {
    return margin.unit == 'px' ? margin.value :
        margin.value * (i % 2 ? rect.width : rect.height) / 100;
  });
  var newRect = {
    top: rect.top - margins[0],
    right: rect.right + margins[1],
    bottom: rect.bottom + margins[2],
    left: rect.left - margins[3]
  };
  newRect.width = newRect.right - newRect.left;
  newRect.height = newRect.bottom - newRect.top;

  return newRect;
};


/**
 * Accepts an old and new entry and returns true if at least one of the
 * threshold values has been crossed.
 * @param {?IntersectionObserverEntry} oldEntry The previous entry for a
 *    particular target element or null if no previous entry exists.
 * @param {IntersectionObserverEntry} newEntry The current entry for a
 *    particular target element.
 * @return {boolean} Returns true if a any threshold has been crossed.
 * @private
 */
IntersectionObserver.prototype._hasCrossedThreshold =
    function(oldEntry, newEntry) {

  // To make comparing easier, an entry that has a ratio of 0
  // but does not actually intersect is given a value of -1
  var oldRatio = oldEntry && oldEntry.isIntersecting ?
      oldEntry.intersectionRatio || 0 : -1;
  var newRatio = newEntry.isIntersecting ?
      newEntry.intersectionRatio || 0 : -1;

  // Ignore unchanged ratios
  if (oldRatio === newRatio) return;

  for (var i = 0; i < this.thresholds.length; i++) {
    var threshold = this.thresholds[i];

    // Return true if an entry matches a threshold or if the new ratio
    // and the old ratio are on the opposite sides of a threshold.
    if (threshold == oldRatio || threshold == newRatio ||
        threshold < oldRatio !== threshold < newRatio) {
      return true;
    }
  }
};


/**
 * Returns whether or not the root element is an element and is in the DOM.
 * @return {boolean} True if the root element is an element and is in the DOM.
 * @private
 */
IntersectionObserver.prototype._rootIsInDom = function() {
  return !this.root || containsDeep(document, this.root);
};


/**
 * Returns whether or not the target element is a child of root.
 * @param {Element} target The target element to check.
 * @return {boolean} True if the target element is a child of root.
 * @private
 */
IntersectionObserver.prototype._rootContainsTarget = function(target) {
  return containsDeep(this.root || document, target);
};


/**
 * Adds the instance to the global IntersectionObserver registry if it isn't
 * already present.
 * @private
 */
IntersectionObserver.prototype._registerInstance = function() {
  if (registry.indexOf(this) < 0) {
    registry.push(this);
  }
};


/**
 * Removes the instance from the global IntersectionObserver registry.
 * @private
 */
IntersectionObserver.prototype._unregisterInstance = function() {
  var index = registry.indexOf(this);
  if (index != -1) registry.splice(index, 1);
};


/**
 * Returns the result of the performance.now() method or null in browsers
 * that don't support the API.
 * @return {number} The elapsed time since the page was requested.
 */
function now() {
  return window.performance && performance.now && performance.now();
}


/**
 * Throttles a function and delays its execution, so it's only called at most
 * once within a given time period.
 * @param {Function} fn The function to throttle.
 * @param {number} timeout The amount of time that must pass before the
 *     function can be called again.
 * @return {Function} The throttled function.
 */
function throttle(fn, timeout) {
  var timer = null;
  return function () {
    if (!timer) {
      timer = setTimeout(function() {
        fn();
        timer = null;
      }, timeout);
    }
  };
}


/**
 * Adds an event handler to a DOM node ensuring cross-browser compatibility.
 * @param {Node} node The DOM node to add the event handler to.
 * @param {string} event The event name.
 * @param {Function} fn The event handler to add.
 * @param {boolean} opt_useCapture Optionally adds the even to the capture
 *     phase. Note: this only works in modern browsers.
 */
function addEvent(node, event, fn, opt_useCapture) {
  if (typeof node.addEventListener == 'function') {
    node.addEventListener(event, fn, opt_useCapture || false);
  }
  else if (typeof node.attachEvent == 'function') {
    node.attachEvent('on' + event, fn);
  }
}


/**
 * Removes a previously added event handler from a DOM node.
 * @param {Node} node The DOM node to remove the event handler from.
 * @param {string} event The event name.
 * @param {Function} fn The event handler to remove.
 * @param {boolean} opt_useCapture If the event handler was added with this
 *     flag set to true, it should be set to true here in order to remove it.
 */
function removeEvent(node, event, fn, opt_useCapture) {
  if (typeof node.removeEventListener == 'function') {
    node.removeEventListener(event, fn, opt_useCapture || false);
  }
  else if (typeof node.detatchEvent == 'function') {
    node.detatchEvent('on' + event, fn);
  }
}


/**
 * Returns the intersection between two rect objects.
 * @param {Object} rect1 The first rect.
 * @param {Object} rect2 The second rect.
 * @return {?Object} The intersection rect or undefined if no intersection
 *     is found.
 */
function computeRectIntersection(rect1, rect2) {
  var top = Math.max(rect1.top, rect2.top);
  var bottom = Math.min(rect1.bottom, rect2.bottom);
  var left = Math.max(rect1.left, rect2.left);
  var right = Math.min(rect1.right, rect2.right);
  var width = right - left;
  var height = bottom - top;

  return (width >= 0 && height >= 0) && {
    top: top,
    bottom: bottom,
    left: left,
    right: right,
    width: width,
    height: height
  };
}


/**
 * Shims the native getBoundingClientRect for compatibility with older IE.
 * @param {Element} el The element whose bounding rect to get.
 * @return {Object} The (possibly shimmed) rect of the element.
 */
function getBoundingClientRect(el) {
  var rect;

  try {
    rect = el.getBoundingClientRect();
  } catch (err) {
    // Ignore Windows 7 IE11 "Unspecified error"
    // https://github.com/w3c/IntersectionObserver/pull/205
  }

  if (!rect) return getEmptyRect();

  // Older IE
  if (!(rect.width && rect.height)) {
    rect = {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.right - rect.left,
      height: rect.bottom - rect.top
    };
  }
  return rect;
}


/**
 * Returns an empty rect object. An empty rect is returned when an element
 * is not in the DOM.
 * @return {Object} The empty rect.
 */
function getEmptyRect() {
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0
  };
}

/**
 * Checks to see if a parent element contains a child element (including inside
 * shadow DOM).
 * @param {Node} parent The parent element.
 * @param {Node} child The child element.
 * @return {boolean} True if the parent node contains the child node.
 */
function containsDeep(parent, child) {
  var node = child;
  while (node) {
    if (node == parent) return true;

    node = getParentNode(node);
  }
  return false;
}


/**
 * Gets the parent node of an element or its host element if the parent node
 * is a shadow root.
 * @param {Node} node The node whose parent to get.
 * @return {Node|null} The parent node or null if no parent exists.
 */
function getParentNode(node) {
  var parent = node.parentNode;

  if (parent && parent.nodeType == 11 && parent.host) {
    // If the parent is a shadow root, return the host element.
    return parent.host;
  }

  if (parent && parent.assignedSlot) {
    // If the parent is distributed in a <slot>, return the parent of a slot.
    return parent.assignedSlot.parentNode;
  }

  return parent;
}


// Exposes the constructors globally.
window.IntersectionObserver = IntersectionObserver;
window.IntersectionObserverEntry = IntersectionObserverEntry;

}());


/***/ }),

/***/ "./node_modules/is-plain-object/index.js":
/*!***********************************************!*\
  !*** ./node_modules/is-plain-object/index.js ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * is-plain-object <https://github.com/jonschlinkert/is-plain-object>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */



var isObject = __webpack_require__(/*! isobject */ "./node_modules/isobject/index.js");

function isObjectObject(o) {
  return isObject(o) === true
    && Object.prototype.toString.call(o) === '[object Object]';
}

module.exports = function isPlainObject(o) {
  var ctor,prot;

  if (isObjectObject(o) === false) return false;

  // If has modified constructor
  ctor = o.constructor;
  if (typeof ctor !== 'function') return false;

  // If has modified prototype
  prot = ctor.prototype;
  if (isObjectObject(prot) === false) return false;

  // If constructor does not have an Object-specific method
  if (prot.hasOwnProperty('isPrototypeOf') === false) {
    return false;
  }

  // Most likely a plain Object
  return true;
};


/***/ }),

/***/ "./node_modules/isobject/index.js":
/*!****************************************!*\
  !*** ./node_modules/isobject/index.js ***!
  \****************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*!
 * isobject <https://github.com/jonschlinkert/isobject>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */



module.exports = function isObject(val) {
  return val != null && typeof val === 'object' && Array.isArray(val) === false;
};


/***/ }),

/***/ "./node_modules/js-cookie/src/js.cookie.js":
/*!*************************************************!*\
  !*** ./node_modules/js-cookie/src/js.cookie.js ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
 * JavaScript Cookie v2.2.1
 * https://github.com/js-cookie/js-cookie
 *
 * Copyright 2006, 2015 Klaus Hartl & Fagner Brack
 * Released under the MIT license
 */
;(function (factory) {
	var registeredInModuleLoader;
	if (true) {
		!(__WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.call(exports, __webpack_require__, exports, module)) :
				__WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
		registeredInModuleLoader = true;
	}
	if (true) {
		module.exports = factory();
		registeredInModuleLoader = true;
	}
	if (!registeredInModuleLoader) {
		var OldCookies = window.Cookies;
		var api = window.Cookies = factory();
		api.noConflict = function () {
			window.Cookies = OldCookies;
			return api;
		};
	}
}(function () {
	function extend () {
		var i = 0;
		var result = {};
		for (; i < arguments.length; i++) {
			var attributes = arguments[ i ];
			for (var key in attributes) {
				result[key] = attributes[key];
			}
		}
		return result;
	}

	function decode (s) {
		return s.replace(/(%[0-9A-Z]{2})+/g, decodeURIComponent);
	}

	function init (converter) {
		function api() {}

		function set (key, value, attributes) {
			if (typeof document === 'undefined') {
				return;
			}

			attributes = extend({
				path: '/'
			}, api.defaults, attributes);

			if (typeof attributes.expires === 'number') {
				attributes.expires = new Date(new Date() * 1 + attributes.expires * 864e+5);
			}

			// We're using "expires" because "max-age" is not supported by IE
			attributes.expires = attributes.expires ? attributes.expires.toUTCString() : '';

			try {
				var result = JSON.stringify(value);
				if (/^[\{\[]/.test(result)) {
					value = result;
				}
			} catch (e) {}

			value = converter.write ?
				converter.write(value, key) :
				encodeURIComponent(String(value))
					.replace(/%(23|24|26|2B|3A|3C|3E|3D|2F|3F|40|5B|5D|5E|60|7B|7D|7C)/g, decodeURIComponent);

			key = encodeURIComponent(String(key))
				.replace(/%(23|24|26|2B|5E|60|7C)/g, decodeURIComponent)
				.replace(/[\(\)]/g, escape);

			var stringifiedAttributes = '';
			for (var attributeName in attributes) {
				if (!attributes[attributeName]) {
					continue;
				}
				stringifiedAttributes += '; ' + attributeName;
				if (attributes[attributeName] === true) {
					continue;
				}

				// Considers RFC 6265 section 5.2:
				// ...
				// 3.  If the remaining unparsed-attributes contains a %x3B (";")
				//     character:
				// Consume the characters of the unparsed-attributes up to,
				// not including, the first %x3B (";") character.
				// ...
				stringifiedAttributes += '=' + attributes[attributeName].split(';')[0];
			}

			return (document.cookie = key + '=' + value + stringifiedAttributes);
		}

		function get (key, json) {
			if (typeof document === 'undefined') {
				return;
			}

			var jar = {};
			// To prevent the for loop in the first place assign an empty array
			// in case there are no cookies at all.
			var cookies = document.cookie ? document.cookie.split('; ') : [];
			var i = 0;

			for (; i < cookies.length; i++) {
				var parts = cookies[i].split('=');
				var cookie = parts.slice(1).join('=');

				if (!json && cookie.charAt(0) === '"') {
					cookie = cookie.slice(1, -1);
				}

				try {
					var name = decode(parts[0]);
					cookie = (converter.read || converter)(cookie, name) ||
						decode(cookie);

					if (json) {
						try {
							cookie = JSON.parse(cookie);
						} catch (e) {}
					}

					jar[name] = cookie;

					if (key === name) {
						break;
					}
				} catch (e) {}
			}

			return key ? jar[key] : jar;
		}

		api.set = set;
		api.get = function (key) {
			return get(key, false /* read as raw */);
		};
		api.getJSON = function (key) {
			return get(key, true /* read as json */);
		};
		api.remove = function (key, attributes) {
			set(key, '', extend(attributes, {
				expires: -1
			}));
		};

		api.defaults = {};

		api.withConverter = init;

		return api;
	}

	return init(function () {});
}));


/***/ }),

/***/ "./node_modules/lodash.debounce/index.js":
/*!***********************************************!*\
  !*** ./node_modules/lodash.debounce/index.js ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = debounce;

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./node_modules/lodash.throttle/index.js":
/*!***********************************************!*\
  !*** ./node_modules/lodash.throttle/index.js ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* WEBPACK VAR INJECTION */(function(global) {/**
 * lodash (Custom Build) <https://lodash.com/>
 * Build: `lodash modularize exports="npm" -o ./`
 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/** Used as references for various `Number` constants. */
var NAN = 0 / 0;

/** `Object#toString` result references. */
var symbolTag = '[object Symbol]';

/** Used to match leading and trailing whitespace. */
var reTrim = /^\s+|\s+$/g;

/** Used to detect bad signed hexadecimal string values. */
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

/** Used to detect binary string values. */
var reIsBinary = /^0b[01]+$/i;

/** Used to detect octal string values. */
var reIsOctal = /^0o[0-7]+$/i;

/** Built-in method references without a dependency on `root`. */
var freeParseInt = parseInt;

/** Detect free variable `global` from Node.js. */
var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

/** Detect free variable `self`. */
var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

/** Used as a reference to the global object. */
var root = freeGlobal || freeSelf || Function('return this')();

/** Used for built-in method references. */
var objectProto = Object.prototype;

/**
 * Used to resolve the
 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
 * of values.
 */
var objectToString = objectProto.toString;

/* Built-in method references for those with the same name as other `lodash` methods. */
var nativeMax = Math.max,
    nativeMin = Math.min;

/**
 * Gets the timestamp of the number of milliseconds that have elapsed since
 * the Unix epoch (1 January 1970 00:00:00 UTC).
 *
 * @static
 * @memberOf _
 * @since 2.4.0
 * @category Date
 * @returns {number} Returns the timestamp.
 * @example
 *
 * _.defer(function(stamp) {
 *   console.log(_.now() - stamp);
 * }, _.now());
 * // => Logs the number of milliseconds it took for the deferred invocation.
 */
var now = function() {
  return root.Date.now();
};

/**
 * Creates a debounced function that delays invoking `func` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was
 * invoked. The debounced function comes with a `cancel` method to cancel
 * delayed `func` invocations and a `flush` method to immediately invoke them.
 * Provide `options` to indicate whether `func` should be invoked on the
 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
 * with the last arguments provided to the debounced function. Subsequent
 * calls to the debounced function return the result of the last `func`
 * invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the debounced function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.debounce` and `_.throttle`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to debounce.
 * @param {number} [wait=0] The number of milliseconds to delay.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=false]
 *  Specify invoking on the leading edge of the timeout.
 * @param {number} [options.maxWait]
 *  The maximum time `func` is allowed to be delayed before it's invoked.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new debounced function.
 * @example
 *
 * // Avoid costly calculations while the window size is in flux.
 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
 *
 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
 * jQuery(element).on('click', _.debounce(sendMail, 300, {
 *   'leading': true,
 *   'trailing': false
 * }));
 *
 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
 * var source = new EventSource('/stream');
 * jQuery(source).on('message', debounced);
 *
 * // Cancel the trailing debounced invocation.
 * jQuery(window).on('popstate', debounced.cancel);
 */
function debounce(func, wait, options) {
  var lastArgs,
      lastThis,
      maxWait,
      result,
      timerId,
      lastCallTime,
      lastInvokeTime = 0,
      leading = false,
      maxing = false,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  wait = toNumber(wait) || 0;
  if (isObject(options)) {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time) {
    var args = lastArgs,
        thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time) {
    // Reset any `maxWait` timer.
    lastInvokeTime = time;
    // Start the timer for the trailing edge.
    timerId = setTimeout(timerExpired, wait);
    // Invoke the leading edge.
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime,
        result = wait - timeSinceLastCall;

    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
  }

  function shouldInvoke(time) {
    var timeSinceLastCall = time - lastCallTime,
        timeSinceLastInvoke = time - lastInvokeTime;

    // Either this is the first call, activity has stopped and we're at the
    // trailing edge, the system time has gone backwards and we're treating
    // it as the trailing edge, or we've hit the `maxWait` limit.
    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
  }

  function timerExpired() {
    var time = now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    // Restart the timer.
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time) {
    timerId = undefined;

    // Only invoke if we have `lastArgs` which means `func` has been
    // debounced at least once.
    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(now());
  }

  function debounced() {
    var time = now(),
        isInvoking = shouldInvoke(time);

    lastArgs = arguments;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        // Handle invocations in a tight loop.
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }
  debounced.cancel = cancel;
  debounced.flush = flush;
  return debounced;
}

/**
 * Creates a throttled function that only invokes `func` at most once per
 * every `wait` milliseconds. The throttled function comes with a `cancel`
 * method to cancel delayed `func` invocations and a `flush` method to
 * immediately invoke them. Provide `options` to indicate whether `func`
 * should be invoked on the leading and/or trailing edge of the `wait`
 * timeout. The `func` is invoked with the last arguments provided to the
 * throttled function. Subsequent calls to the throttled function return the
 * result of the last `func` invocation.
 *
 * **Note:** If `leading` and `trailing` options are `true`, `func` is
 * invoked on the trailing edge of the timeout only if the throttled function
 * is invoked more than once during the `wait` timeout.
 *
 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
 *
 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
 * for details over the differences between `_.throttle` and `_.debounce`.
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Function
 * @param {Function} func The function to throttle.
 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
 * @param {Object} [options={}] The options object.
 * @param {boolean} [options.leading=true]
 *  Specify invoking on the leading edge of the timeout.
 * @param {boolean} [options.trailing=true]
 *  Specify invoking on the trailing edge of the timeout.
 * @returns {Function} Returns the new throttled function.
 * @example
 *
 * // Avoid excessively updating the position while scrolling.
 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
 *
 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
 * jQuery(element).on('click', throttled);
 *
 * // Cancel the trailing throttled invocation.
 * jQuery(window).on('popstate', throttled.cancel);
 */
function throttle(func, wait, options) {
  var leading = true,
      trailing = true;

  if (typeof func != 'function') {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  if (isObject(options)) {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }
  return debounce(func, wait, {
    'leading': leading,
    'maxWait': wait,
    'trailing': trailing
  });
}

/**
 * Checks if `value` is the
 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 *
 * @static
 * @memberOf _
 * @since 0.1.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
 * @example
 *
 * _.isObject({});
 * // => true
 *
 * _.isObject([1, 2, 3]);
 * // => true
 *
 * _.isObject(_.noop);
 * // => true
 *
 * _.isObject(null);
 * // => false
 */
function isObject(value) {
  var type = typeof value;
  return !!value && (type == 'object' || type == 'function');
}

/**
 * Checks if `value` is object-like. A value is object-like if it's not `null`
 * and has a `typeof` result of "object".
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
 * @example
 *
 * _.isObjectLike({});
 * // => true
 *
 * _.isObjectLike([1, 2, 3]);
 * // => true
 *
 * _.isObjectLike(_.noop);
 * // => false
 *
 * _.isObjectLike(null);
 * // => false
 */
function isObjectLike(value) {
  return !!value && typeof value == 'object';
}

/**
 * Checks if `value` is classified as a `Symbol` primitive or object.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
 * @example
 *
 * _.isSymbol(Symbol.iterator);
 * // => true
 *
 * _.isSymbol('abc');
 * // => false
 */
function isSymbol(value) {
  return typeof value == 'symbol' ||
    (isObjectLike(value) && objectToString.call(value) == symbolTag);
}

/**
 * Converts `value` to a number.
 *
 * @static
 * @memberOf _
 * @since 4.0.0
 * @category Lang
 * @param {*} value The value to process.
 * @returns {number} Returns the number.
 * @example
 *
 * _.toNumber(3.2);
 * // => 3.2
 *
 * _.toNumber(Number.MIN_VALUE);
 * // => 5e-324
 *
 * _.toNumber(Infinity);
 * // => Infinity
 *
 * _.toNumber('3.2');
 * // => 3.2
 */
function toNumber(value) {
  if (typeof value == 'number') {
    return value;
  }
  if (isSymbol(value)) {
    return NAN;
  }
  if (isObject(value)) {
    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
    value = isObject(other) ? (other + '') : other;
  }
  if (typeof value != 'string') {
    return value === 0 ? value : +value;
  }
  value = value.replace(reTrim, '');
  var isBinary = reIsBinary.test(value);
  return (isBinary || reIsOctal.test(value))
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : (reIsBadHex.test(value) ? NAN : +value);
}

module.exports = throttle;

/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! ./../webpack/buildin/global.js */ "./node_modules/webpack/buildin/global.js")))

/***/ }),

/***/ "./node_modules/smoothscroll-polyfill/dist/smoothscroll.js":
/*!*****************************************************************!*\
  !*** ./node_modules/smoothscroll-polyfill/dist/smoothscroll.js ***!
  \*****************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

/* smoothscroll v0.4.4 - 2019 - Dustan Kasten, Jeremias Menichelli - MIT License */
(function () {
  'use strict';

  // polyfill
  function polyfill() {
    // aliases
    var w = window;
    var d = document;

    // return if scroll behavior is supported and polyfill is not forced
    if (
      'scrollBehavior' in d.documentElement.style &&
      w.__forceSmoothScrollPolyfill__ !== true
    ) {
      return;
    }

    // globals
    var Element = w.HTMLElement || w.Element;
    var SCROLL_TIME = 468;

    // object gathering original scroll methods
    var original = {
      scroll: w.scroll || w.scrollTo,
      scrollBy: w.scrollBy,
      elementScroll: Element.prototype.scroll || scrollElement,
      scrollIntoView: Element.prototype.scrollIntoView
    };

    // define timing method
    var now =
      w.performance && w.performance.now
        ? w.performance.now.bind(w.performance)
        : Date.now;

    /**
     * indicates if a the current browser is made by Microsoft
     * @method isMicrosoftBrowser
     * @param {String} userAgent
     * @returns {Boolean}
     */
    function isMicrosoftBrowser(userAgent) {
      var userAgentPatterns = ['MSIE ', 'Trident/', 'Edge/'];

      return new RegExp(userAgentPatterns.join('|')).test(userAgent);
    }

    /*
     * IE has rounding bug rounding down clientHeight and clientWidth and
     * rounding up scrollHeight and scrollWidth causing false positives
     * on hasScrollableSpace
     */
    var ROUNDING_TOLERANCE = isMicrosoftBrowser(w.navigator.userAgent) ? 1 : 0;

    /**
     * changes scroll position inside an element
     * @method scrollElement
     * @param {Number} x
     * @param {Number} y
     * @returns {undefined}
     */
    function scrollElement(x, y) {
      this.scrollLeft = x;
      this.scrollTop = y;
    }

    /**
     * returns result of applying ease math function to a number
     * @method ease
     * @param {Number} k
     * @returns {Number}
     */
    function ease(k) {
      return 0.5 * (1 - Math.cos(Math.PI * k));
    }

    /**
     * indicates if a smooth behavior should be applied
     * @method shouldBailOut
     * @param {Number|Object} firstArg
     * @returns {Boolean}
     */
    function shouldBailOut(firstArg) {
      if (
        firstArg === null ||
        typeof firstArg !== 'object' ||
        firstArg.behavior === undefined ||
        firstArg.behavior === 'auto' ||
        firstArg.behavior === 'instant'
      ) {
        // first argument is not an object/null
        // or behavior is auto, instant or undefined
        return true;
      }

      if (typeof firstArg === 'object' && firstArg.behavior === 'smooth') {
        // first argument is an object and behavior is smooth
        return false;
      }

      // throw error when behavior is not supported
      throw new TypeError(
        'behavior member of ScrollOptions ' +
          firstArg.behavior +
          ' is not a valid value for enumeration ScrollBehavior.'
      );
    }

    /**
     * indicates if an element has scrollable space in the provided axis
     * @method hasScrollableSpace
     * @param {Node} el
     * @param {String} axis
     * @returns {Boolean}
     */
    function hasScrollableSpace(el, axis) {
      if (axis === 'Y') {
        return el.clientHeight + ROUNDING_TOLERANCE < el.scrollHeight;
      }

      if (axis === 'X') {
        return el.clientWidth + ROUNDING_TOLERANCE < el.scrollWidth;
      }
    }

    /**
     * indicates if an element has a scrollable overflow property in the axis
     * @method canOverflow
     * @param {Node} el
     * @param {String} axis
     * @returns {Boolean}
     */
    function canOverflow(el, axis) {
      var overflowValue = w.getComputedStyle(el, null)['overflow' + axis];

      return overflowValue === 'auto' || overflowValue === 'scroll';
    }

    /**
     * indicates if an element can be scrolled in either axis
     * @method isScrollable
     * @param {Node} el
     * @param {String} axis
     * @returns {Boolean}
     */
    function isScrollable(el) {
      var isScrollableY = hasScrollableSpace(el, 'Y') && canOverflow(el, 'Y');
      var isScrollableX = hasScrollableSpace(el, 'X') && canOverflow(el, 'X');

      return isScrollableY || isScrollableX;
    }

    /**
     * finds scrollable parent of an element
     * @method findScrollableParent
     * @param {Node} el
     * @returns {Node} el
     */
    function findScrollableParent(el) {
      while (el !== d.body && isScrollable(el) === false) {
        el = el.parentNode || el.host;
      }

      return el;
    }

    /**
     * self invoked function that, given a context, steps through scrolling
     * @method step
     * @param {Object} context
     * @returns {undefined}
     */
    function step(context) {
      var time = now();
      var value;
      var currentX;
      var currentY;
      var elapsed = (time - context.startTime) / SCROLL_TIME;

      // avoid elapsed times higher than one
      elapsed = elapsed > 1 ? 1 : elapsed;

      // apply easing to elapsed time
      value = ease(elapsed);

      currentX = context.startX + (context.x - context.startX) * value;
      currentY = context.startY + (context.y - context.startY) * value;

      context.method.call(context.scrollable, currentX, currentY);

      // scroll more if we have not reached our destination
      if (currentX !== context.x || currentY !== context.y) {
        w.requestAnimationFrame(step.bind(w, context));
      }
    }

    /**
     * scrolls window or element with a smooth behavior
     * @method smoothScroll
     * @param {Object|Node} el
     * @param {Number} x
     * @param {Number} y
     * @returns {undefined}
     */
    function smoothScroll(el, x, y) {
      var scrollable;
      var startX;
      var startY;
      var method;
      var startTime = now();

      // define scroll context
      if (el === d.body) {
        scrollable = w;
        startX = w.scrollX || w.pageXOffset;
        startY = w.scrollY || w.pageYOffset;
        method = original.scroll;
      } else {
        scrollable = el;
        startX = el.scrollLeft;
        startY = el.scrollTop;
        method = scrollElement;
      }

      // scroll looping over a frame
      step({
        scrollable: scrollable,
        method: method,
        startTime: startTime,
        startX: startX,
        startY: startY,
        x: x,
        y: y
      });
    }

    // ORIGINAL METHODS OVERRIDES
    // w.scroll and w.scrollTo
    w.scroll = w.scrollTo = function() {
      // avoid action when no arguments are passed
      if (arguments[0] === undefined) {
        return;
      }

      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0]) === true) {
        original.scroll.call(
          w,
          arguments[0].left !== undefined
            ? arguments[0].left
            : typeof arguments[0] !== 'object'
              ? arguments[0]
              : w.scrollX || w.pageXOffset,
          // use top prop, second argument if present or fallback to scrollY
          arguments[0].top !== undefined
            ? arguments[0].top
            : arguments[1] !== undefined
              ? arguments[1]
              : w.scrollY || w.pageYOffset
        );

        return;
      }

      // LET THE SMOOTHNESS BEGIN!
      smoothScroll.call(
        w,
        d.body,
        arguments[0].left !== undefined
          ? ~~arguments[0].left
          : w.scrollX || w.pageXOffset,
        arguments[0].top !== undefined
          ? ~~arguments[0].top
          : w.scrollY || w.pageYOffset
      );
    };

    // w.scrollBy
    w.scrollBy = function() {
      // avoid action when no arguments are passed
      if (arguments[0] === undefined) {
        return;
      }

      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0])) {
        original.scrollBy.call(
          w,
          arguments[0].left !== undefined
            ? arguments[0].left
            : typeof arguments[0] !== 'object' ? arguments[0] : 0,
          arguments[0].top !== undefined
            ? arguments[0].top
            : arguments[1] !== undefined ? arguments[1] : 0
        );

        return;
      }

      // LET THE SMOOTHNESS BEGIN!
      smoothScroll.call(
        w,
        d.body,
        ~~arguments[0].left + (w.scrollX || w.pageXOffset),
        ~~arguments[0].top + (w.scrollY || w.pageYOffset)
      );
    };

    // Element.prototype.scroll and Element.prototype.scrollTo
    Element.prototype.scroll = Element.prototype.scrollTo = function() {
      // avoid action when no arguments are passed
      if (arguments[0] === undefined) {
        return;
      }

      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0]) === true) {
        // if one number is passed, throw error to match Firefox implementation
        if (typeof arguments[0] === 'number' && arguments[1] === undefined) {
          throw new SyntaxError('Value could not be converted');
        }

        original.elementScroll.call(
          this,
          // use left prop, first number argument or fallback to scrollLeft
          arguments[0].left !== undefined
            ? ~~arguments[0].left
            : typeof arguments[0] !== 'object' ? ~~arguments[0] : this.scrollLeft,
          // use top prop, second argument or fallback to scrollTop
          arguments[0].top !== undefined
            ? ~~arguments[0].top
            : arguments[1] !== undefined ? ~~arguments[1] : this.scrollTop
        );

        return;
      }

      var left = arguments[0].left;
      var top = arguments[0].top;

      // LET THE SMOOTHNESS BEGIN!
      smoothScroll.call(
        this,
        this,
        typeof left === 'undefined' ? this.scrollLeft : ~~left,
        typeof top === 'undefined' ? this.scrollTop : ~~top
      );
    };

    // Element.prototype.scrollBy
    Element.prototype.scrollBy = function() {
      // avoid action when no arguments are passed
      if (arguments[0] === undefined) {
        return;
      }

      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0]) === true) {
        original.elementScroll.call(
          this,
          arguments[0].left !== undefined
            ? ~~arguments[0].left + this.scrollLeft
            : ~~arguments[0] + this.scrollLeft,
          arguments[0].top !== undefined
            ? ~~arguments[0].top + this.scrollTop
            : ~~arguments[1] + this.scrollTop
        );

        return;
      }

      this.scroll({
        left: ~~arguments[0].left + this.scrollLeft,
        top: ~~arguments[0].top + this.scrollTop,
        behavior: arguments[0].behavior
      });
    };

    // Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function() {
      // avoid smooth behavior if not required
      if (shouldBailOut(arguments[0]) === true) {
        original.scrollIntoView.call(
          this,
          arguments[0] === undefined ? true : arguments[0]
        );

        return;
      }

      // LET THE SMOOTHNESS BEGIN!
      var scrollableParent = findScrollableParent(this);
      var parentRects = scrollableParent.getBoundingClientRect();
      var clientRects = this.getBoundingClientRect();

      if (scrollableParent !== d.body) {
        // reveal element inside parent
        smoothScroll.call(
          this,
          scrollableParent,
          scrollableParent.scrollLeft + clientRects.left - parentRects.left,
          scrollableParent.scrollTop + clientRects.top - parentRects.top
        );

        // reveal parent in viewport unless is fixed
        if (w.getComputedStyle(scrollableParent).position !== 'fixed') {
          w.scrollBy({
            left: parentRects.left,
            top: parentRects.top,
            behavior: 'smooth'
          });
        }
      } else {
        // reveal element in viewport
        w.scrollBy({
          left: clientRects.left,
          top: clientRects.top,
          behavior: 'smooth'
        });
      }
    };
  }

  if (true) {
    // commonjs
    module.exports = { polyfill: polyfill };
  } else {}

}());


/***/ }),

/***/ "./node_modules/tiny-emitter/index.js":
/*!********************************************!*\
  !*** ./node_modules/tiny-emitter/index.js ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports) {

function E () {
  // Keep this empty so it's easier to inherit from
  // (via https://github.com/lipsmack from https://github.com/scottcorgan/tiny-emitter/issues/3)
}

E.prototype = {
  on: function (name, callback, ctx) {
    var e = this.e || (this.e = {});

    (e[name] || (e[name] = [])).push({
      fn: callback,
      ctx: ctx
    });

    return this;
  },

  once: function (name, callback, ctx) {
    var self = this;
    function listener () {
      self.off(name, listener);
      callback.apply(ctx, arguments);
    };

    listener._ = callback
    return this.on(name, listener, ctx);
  },

  emit: function (name) {
    var data = [].slice.call(arguments, 1);
    var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
    var i = 0;
    var len = evtArr.length;

    for (i; i < len; i++) {
      evtArr[i].fn.apply(evtArr[i].ctx, data);
    }

    return this;
  },

  off: function (name, callback) {
    var e = this.e || (this.e = {});
    var evts = e[name];
    var liveEvents = [];

    if (evts && callback) {
      for (var i = 0, len = evts.length; i < len; i++) {
        if (evts[i].fn !== callback && evts[i].fn._ !== callback)
          liveEvents.push(evts[i]);
      }
    }

    // Remove event from queue to prevent memory leak
    // Suggested by https://github.com/lazd
    // Ref: https://github.com/scottcorgan/tiny-emitter/commit/c6ebfaa9bc973b33d110a84a307742b7cf94c953#commitcomment-5024910

    (liveEvents.length)
      ? e[name] = liveEvents
      : delete e[name];

    return this;
  }
};

module.exports = E;
module.exports.TinyEmitter = E;


/***/ }),

/***/ "./node_modules/webpack/buildin/global.js":
/*!***********************************!*\
  !*** (webpack)/buildin/global.js ***!
  \***********************************/
/*! no static exports found */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || new Function("return this")();
} catch (e) {
	// This works if the window reference is available
	if (typeof window === "object") g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),

/***/ "./src/css/index.scss":
/*!****************************!*\
  !*** ./src/css/index.scss ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// extracted by mini-css-extract-plugin

/***/ }),

/***/ "./src/js/components/banner.js":
/*!*************************************!*\
  !*** ./src/js/components/banner.js ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var equalizeBannerHeight = function equalizeBannerHeight() {
  var bannerHeight = $('.banner').outerHeight(true);
  var isMobile = $(window).width() <= 992;
  $('.banner-open #shopify-section-menu-bar').css('top', "".concat(bannerHeight, "px"));
  $('.banner-open > main').css('maring-top', "".concat(bannerHeight, "px"));
};

  
var $countdownElement = $('.js-countdown-timer');
var countdownTimestamp = new Date($countdownElement.attr('datetime')).getTime();
var countdownInterval = setInterval(function () {
  var now = new Date().getTime();
  var diff = countdownTimestamp - now;
  var days = Math.floor(diff / (1000 * 60 * 60 * 24));
  var hours = Math.floor(diff % (1000 * 60 * 60 * 24) / (1000 * 60 * 60));
  var minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
  var seconds = Math.floor(diff % (1000 * 60) / 1000);
  $countdownElement.text("\n    ".concat(days > 0 ? "".concat(days, "d") : '', "\n    ").concat(hours > 0 ? "".concat(hours, "h") : '', "\n    ").concat(minutes > 0 ? "".concat(minutes, "m") : '', "\n    ").concat(seconds > 0 ? "".concat(seconds, "s") : '', "\n  "));

  if (diff < 0) {
    clearInterval(countdownInterval);
    $countdownElement.parent().html($countdownElement.data('expire-text'));
  }
}, 1000);

/***/ }),

/***/ "./src/js/components/cartDrawer.js":
/*!*****************************************!*\
  !*** ./src/js/components/cartDrawer.js ***!
  \*****************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return CartDrawer; });
/* harmony import */ var _updateCart__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../updateCart */ "./src/js/updateCart.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }



var CartDrawer = /*#__PURE__*/function () {
  function CartDrawer() {
    var _this = this;

    _classCallCheck(this, CartDrawer);

    this.cart = document.getElementById('shopify-section-cart');
    this.closeButton = this.cart.querySelector('button[name="close"]');
    this.addFreeSampleButtons = this.cart.querySelectorAll('.free-sample .item');
    this.closeButton.addEventListener('click', this.closeCart.bind(this));
    this.addFreeSampleButtons.forEach(function (button) {
      button.addEventListener('click', _this.addFreeSample.bind(_this));
    });
    this.cart.classList.add('cart-drawer-container');
    this.cart.classList.add('cart-drawer-container--ajax');
    this.reChargeThemeFooterJS(); //click outside cart closes drawer

    document.documentElement.addEventListener('click', this.closeCart.bind(this));
    this.cart.addEventListener('click', function (e) {
      e.stopPropagation();
    });
    Object(_updateCart__WEBPACK_IMPORTED_MODULE_0__["initializeCart"])();
  }

  _createClass(CartDrawer, [{
    key: "reChargeThemeFooterJS",
    value: function reChargeThemeFooterJS() {
      if (!document.querySelector('body').classList.contains('cart')) {
        document.querySelectorAll('[href="/checkout"], form[action="/cart"] button[type="submit"], form[action="/cart"] input[type="submit"], form[action="/checkout"] input[type="submit"], form[action="/checkout"] button[type="submit"]').forEach(function (elem) {
          return elem.addEventListener('click', function (e) {
            if (!e.target.hasAttribute('data-disable-recharge')) {
              e.preventDefault();
              var hasReCharge = false;
              fetch('/cart.js', {
                method: 'GET'
              }).then(function (res) {
                return res.json();
              }).then(function (res) {
                res.items.forEach(function (el) {
                  if (!hasReCharge) {
                    if (el.properties != null) {
                      if (el.properties.shipping_interval_frequency != undefined) {
                        console.log(el.properties.shipping_interval_frequency);
                        hasReCharge = true;
                      }
                    }
                  }

                  function get_cookie(name) {
                    return (document.cookie.match('(^|; )' + name + '=([^;]*)') || 0)[2];
                  }

                  do {
                    var token = get_cookie('cart');
                  } while (token == undefined);

                  var myshopify_domain = Window.storeUrl;

                  try {
                    var ga_linker = ga.getAll()[0].get('linkerParam');
                  } catch (err) {
                    var ga_linker = '';
                  }

                  var checkout_url = 'https://checkout.rechargeapps.com/r/checkout?myshopify_domain=' + myshopify_domain + '&cart_token=' + token + '&' + ga_linker;

                  try {
                    var data = {};
                    var noteElem = document.querySelector('[name="note"]');

                    if (noteElem && noteElem.value != null) {
                      data['note'] = noteElem.value;
                      fetch('/cart/update.js', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                      }).then(function (res) {
                        console.log('Sent');

                        if (hasReCharge) {
                          window.location.href = checkout_url;
                        } else {
                          window.location.href = '/checkout';
                        }
                      }).catch(function () {
                        return window.location.href = '/cart';
                      });
                    } else {
                      if (hasReCharge) {
                        window.location.href = checkout_url;
                      } else {
                        window.location.href = '/checkout';
                      }
                    }
                  } catch (e) {
                    window.location.href = '/cart';
                  }
                });
              });
            } else {
              console.info('ReCharge disabled');
            }
          });
        });
      }
    }
  }, {
    key: "closeCart",
    value: function closeCart() {
      document.querySelector('body').classList.remove('cart-open');
      this.cart.classList.remove('show');
    }
  }, {
    key: "addFreeSample",
    value: function addFreeSample(e) {
      var target = e.target;
      var freeSampleContainer = document.querySelector('.cart-drawer-container .free-sample'); // Disable add free sample button if one already added

      freeSampleContainer.classList.add('hidden');

      while (!target.classList.contains('item')) {
        target = target.parentElement;
      }

      var variantId = target.dataset.id;
      fetch('/cart.js', {
        method: 'GET'
      }).then(function (res) {
        return res.json();
      }).then(function (res) {
        // Check if free sample is already added
        var freeSampleExists = false;
        res.items.forEach(function (item) {
          if (item.properties) {
            if (item.properties.free_sample === true) freeSampleExists = true;
          }
        });
        return freeSampleExists;
      }).then(function (freeSampleExists) {
        // Only add free sample only if there is none
        if (!freeSampleExists) {
          fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              quantity: 1,
              id: variantId,
              properties: {
                free_sample: true
              }
            })
          }).then(function (res) {
            if (res.ok) return res.json();else throw Error("Request rejected with status ".concat(res.status));
          }).then(function () {
            Object(_updateCart__WEBPACK_IMPORTED_MODULE_0__["initializeCart"])();
          }).catch(console.log);
        }
      }).catch(console.log);
    }
  }]);

  return CartDrawer;
}();



/***/ }),

/***/ "./src/js/components/footer.js":
/*!*************************************!*\
  !*** ./src/js/components/footer.js ***!
  \*************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Footer; });
/* harmony import */ var utils_mediaQuery__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! utils/mediaQuery */ "./src/js/utils/mediaQuery.js");
/* harmony import */ var utils_form_validator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! utils/form-validator */ "./src/js/utils/form-validator.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }




var Footer = /*#__PURE__*/function () {
  function Footer() {
    var _this = this,
        _arguments = arguments;

    _classCallCheck(this, Footer);

    this.accordionBtn = document.querySelectorAll('.accordion--btn');
    this.accordionBtn.forEach(function (button) {
      button.addEventListener('click', _this.toggleAccordion.bind(_this));
    });
    new utils_form_validator__WEBPACK_IMPORTED_MODULE_1__["default"](document.querySelector('.footer--newsletter form'), function () {
      console.log(_arguments);
    });
    this.initAccessiBe();
  }

  _createClass(Footer, [{
    key: "toggleAccordion",
    value: function toggleAccordion(e) {
      var target = e.target;
      var accordionPanel = target.nextElementSibling;
      var panelHeight = accordionPanel.style.maxHeight;
      target.querySelector('.chevron svg').classList.toggle('show');
      if (!Object(utils_mediaQuery__WEBPACK_IMPORTED_MODULE_0__["isDown"])('sm')) return;

      if (!panelHeight || panelHeight === '0px') {
        accordionPanel.style.maxHeight = accordionPanel.scrollHeight + 'px';
      } else {
        accordionPanel.style.maxHeight = '0px';
      }
    }
  }, {
    key: "initAccessiBe",
    value: function initAccessiBe() {
      window.addEventListener('load', function () {
        setTimeout(function () {
          document.querySelectorAll('.footer--nav a').forEach(function (element) {
            if (element.getAttribute('href').indexOf('accessibility') >= 0) {
              element.classList.add('link-accessibility');
            }
          });

          if (document.querySelector('.link-accessibility')) {
            document.querySelector('.link-accessibility').addEventListener('click', function (e) {
              e.preventDefault();
              document.querySelector('.acsb-trigger').click();
            });
          }
        }, 1000);
      });
    }
  }]);

  return Footer;
}(); // $(window).on('load', function() {
//     $('.link-accessibility').on('click', function(event) {
//       event.preventDefault();
//       $('.acsb-trigger').trigger('click');
//     });
// });




/***/ }),

/***/ "./src/js/components/menuBar.js":
/*!**************************************!*\
  !*** ./src/js/components/menuBar.js ***!
  \**************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return MenuBar; });
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lodash.debounce */ "./node_modules/lodash.debounce/index.js");
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash_debounce__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var lodash_throttle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! lodash.throttle */ "./node_modules/lodash.throttle/index.js");
/* harmony import */ var lodash_throttle__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(lodash_throttle__WEBPACK_IMPORTED_MODULE_1__);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }




var MenuBar = /*#__PURE__*/function () {
  function MenuBar() {
    var _this = this;

    _classCallCheck(this, MenuBar);

    this.body = document.querySelector('body');
    this.mobileMenu = document.getElementById('nav-drawer__mobile');
    this.mobileMenuItems = this.mobileMenu.querySelectorAll('li > a');
    this.mobileMenuBackBtn = this.mobileMenu.querySelectorAll('.back-btn');
    this.mobileSearchInput = this.mobileMenu.querySelector('.search__mobile input');
    this.mobileClearSearch = this.mobileMenu.querySelector('.search__mobile button.close');
    this.mobileSuggestedSearch = this.mobileMenu.querySelectorAll('.suggested li');
    this.desktopDrawers = document.querySelectorAll('.nav-container__desktop');
    this.desktopMenuItems = document.querySelectorAll('.main-nav__desktop > li');
    this.desktopNestedMenuItems = document.querySelectorAll('.nav-container__desktop .left a');
    this.desktopCloseButtons = document.querySelectorAll('.close-drawer-btn');
    this.desktopToggleSearchButton = document.querySelector('.bm-nav .search');
    this.desktopSearchContainer = document.querySelector('.search-container--desktop');
    this.desktopSearchInput = this.desktopSearchContainer.querySelector('.search-field input');
    this.desktopClearSearch = this.desktopSearchContainer.querySelector('.search-field .clear');
    this.desktopSuggestedSearch = this.desktopSearchContainer.querySelectorAll('li');
    this.mostPopularMain = document.querySelectorAll('.most-popular-main');
    this.hamburgerBtn = document.querySelector('#shopify-section-menu-bar .hamburger');
    this.cartBtn = document.querySelector('#shopify-section-menu-bar .cart');
    this.countrySelector = this.mobileMenu.querySelector('.nav-selector');
    this.lastScroll = 0; // Attach event listeners

    this.hamburgerBtn.addEventListener('click', this.toggleMobileDrawer.bind(this));
    this.cartBtn.addEventListener('click', this.openCart.bind(this));

    if (this.countrySelector) {
      this.countrySelector.addEventListener('change', this.changeSelector.bind(this));
    }

    window.addEventListener('mouseover', this.hideDesktopNav.bind(this));
    window.addEventListener('scroll', lodash_throttle__WEBPACK_IMPORTED_MODULE_1___default()(this.onScroll.bind(this), 400).bind(this));
    this.mobileMenuItems.forEach(function (item) {
      item.addEventListener('click', _this.slideNav.bind(_this));
    });
    this.mobileMenuBackBtn.forEach(function (button) {
      button.addEventListener('click', _this.slideBackNav.bind(_this));
    });
    this.mobileClearSearch.addEventListener('click', function () {
      _this.mobileSearchInput.value = '';

      _this.mobileSearchInput.dispatchEvent(new Event('input', {
        bubbles: false
      }));
    });
    this.mobileSearchInput.addEventListener('input', lodash_debounce__WEBPACK_IMPORTED_MODULE_0___default()(function (e) {
      var value = e.target.value;

      var mainMenu = _this.mobileMenu.querySelector('.main-menu');

      var searchContainer = _this.mobileMenu.querySelector('.search-container--mobile');

      var searchIcon = _this.mobileMenu.querySelector('.fdad.search');

      var closeIcon = _this.mobileMenu.querySelector('.search__mobile button.close');

      _this.displaySearch(value, searchContainer, true);

      if (value) {
        mainMenu.classList.add('fade-hidden');
        searchContainer.classList.remove('fade-hidden');
        searchIcon.classList.add('display-hidden');
        closeIcon.classList.remove('display-hidden');
      } else {
        mainMenu.classList.remove('fade-hidden');
        searchContainer.classList.add('fade-hidden');
        searchIcon.classList.remove('display-hidden');
        closeIcon.classList.add('display-hidden');
      }
    }, 200));
    this.mobileSuggestedSearch.forEach(function (suggestion) {
      suggestion.addEventListener('click', function (e) {
        _this.mobileSearchInput.value = e.target.innerText;

        _this.mobileSearchInput.dispatchEvent(new Event('input', {
          bubbles: false
        }));
      });
    });
    this.desktopDrawers.forEach(function (drawer) {
      drawer.addEventListener('mouseover', function (e) {
        return e.stopPropagation();
      });
    });
    this.desktopMenuItems.forEach(function (item) {
      item.addEventListener('mouseover', _this.showDesktopNav.bind(_this));
    });
    this.desktopNestedMenuItems.forEach(function (item) {
      item.addEventListener('mouseover', _this.showNestedDesktopNav.bind(_this));
    });
    this.desktopCloseButtons.forEach(function (button) {
      button.addEventListener('click', _this.hideDesktopNav.bind(_this));
    });
    this.desktopToggleSearchButton.addEventListener('toggle', function (e) {
      e.stopPropagation();

      _this.hideDesktopNav();

      _this.desktopSearchContainer.classList.add('show');
      
      _this.desktopToggleSearchButton.classList.add('open');

      _this.body.classList.add('menu-open');

      _this.desktopSearchInput.focus();
    });
    this.desktopSearchContainer.addEventListener('mouseover', function (e) {
      return e.stopPropagation();
    });
    
    this.desktopSearchInput.addEventListener('input', lodash_debounce__WEBPACK_IMPORTED_MODULE_0___default()(function (e) {
      var value = e.target.value;

      _this.displaySearch(value, _this.desktopSearchContainer, false);

      if (!value) {
        _this.desktopSearchContainer.querySelector('.results-count').innerText = '';

        _this.desktopSearchContainer.querySelector('.most-searched').classList.remove('hidden');

        _this.desktopSearchContainer.querySelector('.suggested').classList.add('hidden');

        _this.desktopClearSearch.classList.add('hidden');
      } else {
        _this.desktopClearSearch.classList.remove('hidden');
      }
    }, 200));
    
    this.desktopClearSearch.addEventListener('click', function () {
      _this.desktopSearchInput.value = '';

      _this.desktopSearchInput.dispatchEvent(new Event('input', {
        bubbles: false
      }));
    });
    
    this.desktopSuggestedSearch.forEach(function (suggestion) {
      suggestion.addEventListener('click', function (e) {
        _this.desktopSearchInput.value = e.target.innerText;

        _this.desktopSearchInput.dispatchEvent(new Event('input', {
          bubbles: false
        }));
      });
    });
    this.banner = document.querySelector('.banner');

    if (this.banner) {
      this.body.classList.add('banner-open');
    }
  }

  _createClass(MenuBar, [{
    key: "onScroll",
    value: function onScroll(e) {
      var curScroll = window.pageYOffset;

      if (!this.body.classList.contains('menu-open')) {
        if (curScroll > this.lastScroll) {
          // Scrolling down, hide nav
          this.body.classList.add('scrolling-down');
          if ($('#user-icon-popup').hasClass('active')) {
            //$('#user-icon-popup').slideUp(100);
          }
        } else {
          // Scrolling up, show nav
          this.body.classList.remove('scrolling-down');
          setTimeout(function() {
            if ($('#user-icon-popup').hasClass('active')) {
              //$('#user-icon-popup').slideDown(400);
            }
          }, 300);
        }
      }

      this.lastScroll = curScroll <= 0 ? 0 : curScroll;
    }
  }, {
    key: "toggleMobileDrawer",
    value: function toggleMobileDrawer(e) {
      var _this2 = this;

      this.body.classList.add('menu-open');
        this.mobileMenu.classList.toggle('show'); // if closing mobile nav
        $('.user-icon-popup-mobile').css('display','none')
        $('.search-container--desktop').removeClass('active')

      if (!this.mobileMenu.classList.contains('show')) {
        this.body.classList.remove('menu-open');

        this.mobileMenu.ontransitionend = function () {
          // 'reset' main menu after nav fades
          var mobileMenuList = _this2.mobileMenu.querySelector('.main-menu');

          mobileMenuList.style.transform = "translateX(0%)";
          var nested = mobileMenuList.querySelectorAll('.nested');
          nested.forEach(function (el) {
            el.classList.add('hidden');
          });
          _this2.mobileMenu.ontransitionend = null;
        };
      }
    }
  }, {
    key: "slideNav",
    value: function slideNav(e) {
      e.stopPropagation();
      var target = e.target;

      while (target.tagName !== 'LI') {
        target = target.parentElement;
      } // Open link if menu does not have children


      var isRedirect = true;
      var children = target.children;
      var childrenSize = children.length;

      for (var i = 0; i < childrenSize; i++) {
        if (children[i].classList.contains('nested')) {
          isRedirect = false;
          children[i].classList.remove('hidden');
          break;
        }
      }

      if (isRedirect) return;else e.preventDefault(); // Slide drawer

      var mobileMenuList = this.mobileMenu.querySelector('.main-menu');

      if (!mobileMenuList.style.transform) {
        mobileMenuList.style.transform = 'translateX(-100%)';
      } else {
        var numberPattern = /\d+/g;
        var slide = parseInt(mobileMenuList.style.transform.match(numberPattern)[0]) + 100;
        mobileMenuList.style.transform = "translateX(-".concat(slide, "%)");
      }
      $('#nav-drawer__mobile').scrollTop(0);
      
    }
  }, {
    key: "slideBackNav",
    value: function slideBackNav(e) {
      e.stopPropagation(); // Slide drawer back

      var mobileMenuList = this.mobileMenu.querySelector('.main-menu');
      var numberPattern = /\d+/g;
      var slide = parseInt(mobileMenuList.style.transform.match(numberPattern)[0]) - 100;
      mobileMenuList.style.transform = "translateX(-".concat(slide, "%)");
      var target = e.target;

      while (target.tagName !== 'UL') {
        target = target.parentElement;
      }

      setTimeout(function () {
        target.classList.add('hidden');
      }, 300);
    }
  }, {
    key: "hideDesktopNav",
    value: function hideDesktopNav() {
      this.desktopDrawers.forEach(function (el) {
        return el.classList.remove('show');
      });
      this.desktopMenuItems.forEach(function (item) {
        return item.classList.remove('active');
      });
//    this.desktopSearchContainer.classList.remove('show');

      if (!this.mobileMenu.classList.contains('show')) {
        this.body.classList.remove('menu-open');
      }
    }
  }, {
    key: "hideNestedDesktopNav",
    value: function hideNestedDesktopNav() {
      this.desktopNestedMenuItems.forEach(function (item) {
        return item.classList.remove('active');
      });
      var nestedNav = document.querySelectorAll(".nav-container__desktop .nested");
      nestedNav.forEach(function (nav) {
        return nav.parentNode.classList.remove('show');
      });
    }
  }, {
    key: "showDesktopNav",
    value: function showDesktopNav(e) {
      e.stopPropagation();
      var target = e.target;
      var key = target.dataset.key;
      var selectedDrawer = document.querySelector(".nav-container__desktop[data-nav=".concat(key, "]"));
      this.hideDesktopNav();
      this.hideNestedDesktopNav();
      this.body.classList.add('menu-open');
      //if (selectedDrawer !== null) {
      	selectedDrawer.classList.add('show');
      //}
      target.classList.add('active');

      if (key === 'our-products') {
        document.querySelector('.nav-container__desktop .nested[data-key=skincare]').parentNode.classList.add('show');
        document.querySelector('.nav-container__desktop a[data-key=skincare]').classList.add('active');
      }
    }
  }, {
    key: "showNestedDesktopNav",
    value: function showNestedDesktopNav(e) {
      e.stopPropagation();
      var target = e.target;
      var key = target.dataset.key;
      var nestedNav = document.querySelector(".nav-container__desktop .nested[data-key=".concat(key, "]"));
      this.hideNestedDesktopNav();
      if (nestedNav) nestedNav.parentNode.classList.add('show');
      target.classList.add('active');
    }
  }, {
    key: "openCart",
    value: function openCart(e) {
      e.stopPropagation();
      this.body.classList.add('cart-open');
      var cart = document.getElementById('shopify-section-cart');
      cart.classList.add('show');
    }
  }, {
    key: "changeSelector",
    value: function changeSelector(e) {
      var target = e.target;
      window.location.href = target.value;
    }
  }, {
    key: "displaySearch",
    value: function displaySearch(value, searchContainer, isMobile) {
      var _this3 = this;

      var searchResult = searchContainer.querySelector('.result');
      var mostSearchedEl = searchContainer.querySelector('.most-searched');
        var curr = getCustomerId();  
        console.log("current", curr);
        
        //if (curr) {
        //    alert("current logged in", curr);
        //}
        //else {
        //    alert("currentnew", "nouser");
        //}

      if (value) {
       
        this.fetchSearchQuery(value).then(function (products) {
          _this3.clearSearchResult(searchResult); // Remove samples
          products = products.filter(function (p) {
            return p.price !== '0.00' && !Shopify.searchExcludeProductsIDs.includes(p.id);
          });
          var productCount = products.length;
          var hidden = isMobile ? 'display-hidden' : 'hidden';
          var resultCountEl = searchContainer.querySelector('.results-count');
          var result_data = searchContainer.querySelector('.search-container--desktop .result');
          resultCountEl.innerText = "".concat(productCount, " result").concat(productCount != 1 ? 's' : '');
          if (!isMobile) mostSearchedEl.classList.add('hidden');
            if (productCount > 0) {

            searchContainer.querySelector('.suggested').classList.add(hidden);
                products.forEach(function (product) {
                    if (curr) {
                        var product_price = product.price;
                    }
                    else {
                        var product_price = 0;
                    }
              var el = document.createElement('a');
                el.setAttribute('href', product.url);
   
                    el.innerHTML = "\n                <img class='andri' src=\"".concat(product.featured_image.url, "\" alt=\"").concat(product.featured_image.alt, "\">\n                <h3>").concat(product.title, "</h3>\n                <p class='price'>$").concat(product_price, "</p>\n              ");
              searchResult.appendChild(el);
              console.log(el);
            });
          } else { 
            searchContainer.querySelector('.suggested').classList.remove(hidden);
          }
        });
      } else {
        this.clearSearchResult(searchResult);
      }
    }
  }, {
    key: "fetchSearchQuery",
    value: function fetchSearchQuery(query) {
      return fetch(window.root_url + "/search/suggest.json?q=".concat(query) + "&resources[type]=product" + "&resources[limit]=10" + "&resources[options][unavailable_products]=last" + "&resources[options][fields]=tag,title,variants.title,product_type").then(function (res) {
        return res.json();
      }).then(function (suggestions) {
        return suggestions.resources.results.products;
      });
    }
  }, {
    key: "clearSearchResult",
    value: function clearSearchResult(el) {
      while (el.firstChild) {
        el.removeChild(el.firstChild);
      }
    }
  }]);

  return MenuBar;
}();



/***/ }),

/***/ "./src/js/components/parallax/parallaxController.js":
/*!**********************************************************!*\
  !*** ./src/js/components/parallax/parallaxController.js ***!
  \**********************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ParallaxController; });
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lodash.debounce */ "./node_modules/lodash.debounce/index.js");
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash_debounce__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _parallaxItem__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./parallaxItem */ "./src/js/components/parallax/parallaxItem.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }




var ParallaxController = /*#__PURE__*/function () {
  function ParallaxController(selector) {
    var _this = this;

    _classCallCheck(this, ParallaxController);

    this.selector = selector;
    this.parallaxItems = [];
    this.visibleItems = [];
    this.watchingScroll = false;
    this.documentHeight = document.documentElement.clientHeight;
    this.documentWidth = document.documentElement.clientWidth;
    this.onScroll = this.onScroll.bind(this);
    this.animateItems = this.animateItems.bind(this);
    this.createParallaxItems();
    window.addEventListener('resize', lodash_debounce__WEBPACK_IMPORTED_MODULE_0___default()(function () {
      _this.onResize();
    }, 400));
  }

  _createClass(ParallaxController, [{
    key: "createParallaxItems",
    value: function createParallaxItems() {
      var _this2 = this;

      var parallaxElements = [].slice.call(document.querySelectorAll(this.selector));
      parallaxElements.forEach(function (element) {
        var speed = element.dataset.parallaxSpeed ? element.dataset.parallaxSpeed * 0.05 : 0.05;
        var direction = element.dataset.parallaxDirection ? element.dataset.parallaxDirection : 'up';
        var multiplier = direction === 'up' ? -speed : speed;
        var parallaxItem = new _parallaxItem__WEBPACK_IMPORTED_MODULE_1__["default"](element, multiplier);
        parallaxItem.on('intersect', _this2.visibilityChanged.bind(_this2));

        _this2.parallaxItems.push(parallaxItem);
      });
    }
  }, {
    key: "onResize",
    value: function onResize() {
      if (document.documentElement.clientHeight != this.documentHeight || document.documentElement.clientWidth != this.documentWidth) {
        this.documentHeight = document.documentElement.clientHeight;
        this.documentWidth = document.documentElement.clientWidth;
        this.parallaxItems.forEach(function (item) {
          requestAnimationFrame(function () {
            item.calculateDimensions();
          });
        });
      }
    }
  }, {
    key: "onScroll",
    value: function onScroll() {
      if (this.parallaxItems.filter(function (item) {
        return item.isUpdating;
      }).length === 0) {
        requestAnimationFrame(this.animateItems);
      }
    }
  }, {
    key: "animateItems",
    value: function animateItems() {
      var supportPageOffset = window.pageXOffset !== undefined;
      var isCSS1Compat = (document.compatMode || '') === 'CSS1Compat';
      var y = supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop;
      this.visibleItems.forEach(function (item) {
        item.updateTransform(y);
      });
    }
  }, {
    key: "visibilityChanged",
    value: function visibilityChanged() {
      this.visibleItems = this.parallaxItems.filter(function (item) {
        return item.isVisible;
      });

      if (this.visibleItems.length > 0) {
        if (!this.watchingScroll) {
          this.watchingScroll = true;
          window.addEventListener('scroll', this.onScroll);
        }
      } else {
        if (this.watchingScroll) {
          this.watchingScroll = false;
          window.removeEventListener('scroll', this.onScroll);
        }
      }
    }
  }]);

  return ParallaxController;
}();



/***/ }),

/***/ "./src/js/components/parallax/parallaxItem.js":
/*!****************************************************!*\
  !*** ./src/js/components/parallax/parallaxItem.js ***!
  \****************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ParallaxItem; });
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

__webpack_require__(/*! intersection-observer */ "./node_modules/intersection-observer/intersection-observer.js");

var Emitter = __webpack_require__(/*! tiny-emitter */ "./node_modules/tiny-emitter/index.js");
/*
 * Get the transform property for the current browser so we can set the style properly
 */


var transformProp = function () {
  var testEl = document.createElement('div');

  if (testEl.style.transform === null) {
    var vendors = ['Webkit', 'Moz', 'ms'];

    for (var vendor in vendors) {
      if (testEl.style[vendors[vendor] + 'Transform'] !== undefined) {
        return vendors[vendor] + 'Transform';
      }
    }
  }

  return 'transform';
}();

var supportPageOffset = window.pageXOffset !== undefined;
var isCSS1Compat = (document.compatMode || '') === 'CSS1Compat';

var ParallaxItem = /*#__PURE__*/function (_Emitter) {
  _inherits(ParallaxItem, _Emitter);

  var _super = _createSuper(ParallaxItem);

  function ParallaxItem(element, speed) {
    var _this;

    _classCallCheck(this, ParallaxItem);

    _this = _super.call(this);
    _this.element = element;
    _this.speed = speed;
    _this.isVisible = false;
    _this.isUpdating = false;
    _this.isRecalculating = false;
    _this.isAbove = false;
    _this.isBelow = false;
    _this.yTranslate = 0;
    _this.observer = undefined;
    _this.intersect = _this.intersect.bind(_assertThisInitialized(_this));
    _this.y = _this.getScrollPos();

    _this.createObserver();

    _this.calculateDimensions();

    return _this;
  }
  /*
   * Calculates values needed to position this parallaxing item though it's life cycle
   *
   * this.midPoint: the scroll position where the element is vertically centered in the viewport
   * this.maxTranslate: maximum amount the element can move while remaining visible in the viewport
   */


  _createClass(ParallaxItem, [{
    key: "calculateDimensions",
    value: function calculateDimensions() {
      this.isRecalculating = true;
      this.stopObservation();
      this.setStyle(0);
      this.y = this.getScrollPos();
      this.elementTop = this.element.getBoundingClientRect().top + this.y;
      this.elementHeight = this.element.offsetHeight;
      this.viewportHeight = document.documentElement.clientHeight;
      this.midPoint = this.elementTop + this.elementHeight / 2 - this.viewportHeight / 2;
      var modifier = Math.abs(this.speed) * 100;
      var n = this.midPoint - modifier;

      while (n > 0) {
        var scrollPos = n + this.viewportHeight;
        var scrollOffset = n - this.midPoint;
        var yTranslation = Math.round(scrollOffset * this.speed);
        var translatedElement = this.elementTop + yTranslation;

        if (scrollPos <= translatedElement) {
          this.maxTranslate = yTranslation;
          break;
        }

        n -= modifier;
      }

      this.isRecalculating = false;
      this.reposition();
    }
  }, {
    key: "getScrollPos",
    value: function getScrollPos() {
      return supportPageOffset ? window.pageYOffset : isCSS1Compat ? document.documentElement.scrollTop : document.body.scrollTop;
    }
  }, {
    key: "createObserver",
    value: function createObserver() {
      var options = {
        root: null,
        rootMargin: '0px',
        threshold: [0, 1]
      };
      this.observer = new IntersectionObserver(this.intersect, options);
    }
  }, {
    key: "startObservation",
    value: function startObservation() {
      this.observer.observe(this.element);
    }
  }, {
    key: "stopObservation",
    value: function stopObservation() {
      this.observer.unobserve(this.element);
    }
    /*
     * Move element to expected position on init or after resize
     */

  }, {
    key: "reposition",
    value: function reposition() {
      this.updateTransform(this.y);

      if (this.speed < 0) {
        if (this.yTranslate < 0) {
          if (this.yTranslate < -this.maxTranslate) {
            this.setStyle(-this.maxTranslate);
          }
        } else {
          if (this.yTranslate > this.maxTranslate) {
            this.setStyle(this.maxTranslate);
          }
        }
      } else {
        if (this.yTranslate > 0) {
          if (this.yTranslate > -this.maxTranslate) {
            this.setStyle(this.maxTranslate);
          }
        } else {
          if (this.yTranslate < this.maxTranslate) {
            this.setStyle(-this.maxTranslate);
          }
        }
      }

      this.startObservation();
    }
    /*
     * Observes when the element's visibility changes
     *
     * this.isVisible: the element's parallax position will only update if this is true (element is visible in viewport)
     */

  }, {
    key: "intersect",
    value: function intersect(entries, observer) {
      var _this2 = this;

      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          _this2.isVisible = true;
        } else {
          /*
           * When element is above or below the viewport lock the position to this.maxTranslate, so it is in the right position when it intersects again
           */
          _this2.isVisible = false;

          if (entry.boundingClientRect.top < 0) {
            _this2.isAbove = true;
            _this2.isBelow = false;

            _this2.setStyle(-_this2.maxTranslate);
          } else {
            _this2.isBelow = true;
            _this2.isAbove = false;

            _this2.setStyle(_this2.maxTranslate);
          }
        }

        _this2.emit('intersect');
      });
    }
    /*
     * Calculates the parallax transform for the current element
     */

  }, {
    key: "updateTransform",
    value: function updateTransform(scrollY) {
      if (!this.isRecalculating) {
        this.isUpdating = true;
        var scrollOffset = scrollY - this.midPoint;
        var yTranslation = Math.round(scrollOffset * this.speed);
        this.setStyle(yTranslation);
        this.isUpdating = false;
      }
    }
    /*
     * Set a specific transform style on the element
     */

  }, {
    key: "setStyle",
    value: function setStyle(yTranslation) {
      var translate = 'translate3d(0px, ' + yTranslation + 'px, 0px)';
      this.yTranslate = yTranslation;
      this.element.style[transformProp] = translate;
    }
  }]);

  return ParallaxItem;
}(Emitter);



/***/ }),

/***/ "./src/js/components/quickView.js":
/*!****************************************!*\
  !*** ./src/js/components/quickView.js ***!
  \****************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return QuickView; });
/* harmony import */ var _updateCart__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../updateCart */ "./src/js/updateCart.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }



var QuickView = /*#__PURE__*/function () {
  function QuickView(query) {
    var _this = this;

    _classCallCheck(this, QuickView);

    this.quickviewModals = document.querySelectorAll(query);
    if (!this.quickviewModals) return; // --------------- Attach event listeners --------------- //

    this.quickviewModals.forEach(function (modal) {
      var closeModalButton = modal.querySelector('button.close-modal');
      var modalContent = modal.querySelector('.content');
      var selectedImage = modal.querySelector('.hero-selected-img');
      var thumbnails = modal.querySelectorAll('.hero-carousel img');
      var variantOptions = modal.querySelectorAll('.variant-selector .options-container div');
      var sizeVariantSelector = modal.querySelector('.variant-selector.size .dropdown');
      var subscribtionContainer = modal.querySelector('.subs-container');
      var addToCartButton = modal.querySelector('.product-form--submit button');
      closeModalButton.addEventListener('click', _this.closeModal.bind(_this));
      modal.addEventListener('click', _this.closeModal.bind(_this));
      modalContent.addEventListener('click', function (e) {
        return e.stopPropagation();
      });
      selectedImage.addEventListener('load', _this.resetAnimation.bind(_this));
      thumbnails.forEach(function (thumbnail) {
        thumbnail.addEventListener('click', _this.swapHeroImage.bind(_this));
      });
      variantOptions.forEach(function (option) {
        option.addEventListener('click', function (e) {
          return _this.previewVariant(modal, e.target, undefined);
        });
      });

      if (sizeVariantSelector) {
        sizeVariantSelector.addEventListener('click', _this.toggleSizeVariantDropdown.bind(_this, modal));
      }

      if (subscribtionContainer) {
        var subscribeOnceButton = subscribtionContainer.querySelector('.buttons .once');
        var subscribeAutoButton = subscribtionContainer.querySelector('.buttons .freq');
        var subscriptionOptions = subscribtionContainer.querySelectorAll('.frequency-options > div');
        subscribeOnceButton.addEventListener('click', _this.handleBuyOnce.bind(_this, modal));
        subscribeAutoButton.addEventListener('click', _this.handleBuyAuto.bind(_this, modal));
        subscriptionOptions.forEach(function (option) {
          option.addEventListener('click', _this.handleFrequencyChange.bind(_this, modal));
        });
      }

      addToCartButton.addEventListener('click', _this.submitOrder.bind(_this, modal));
    });
  } // --------------- Event handlers --------------- //

  /**
   * Close popup modal
   */


  _createClass(QuickView, [{
    key: "closeModal",
    value: function closeModal(e) {
      var el = e.target;

      while (!el.classList.contains('modal')) {
        el = el.parentElement;
      }

      el.classList.add('out');
      setTimeout(function () {
        el.style.display = 'none';
        el.classList.remove('out');
      }, 250);
    }
    /**
     * Reset animation
     */

  }, {
    key: "resetAnimation",
    value: function resetAnimation(e) {
      var el = e.target;
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = null;
    }
    /**
     * Switch selected image on hero module upon clicking thumbnail
     */

  }, {
    key: "swapHeroImage",
    value: function swapHeroImage(e) {
      var selectedImg = e.target;
      var imgSrc = e.target.dataset.src;
      var imgIndex = e.target.dataset.index;

      while (!selectedImg.classList.contains('hero-carousel')) {
        selectedImg = selectedImg.parentElement;
      }

      selectedImg = selectedImg.previousElementSibling;
      selectedImg.src = imgSrc;
      selectedImg.alt = selectedImg.dataset.alt + ' ' + imgIndex;
    }
    /**
     * Get selected variant id
     */

  }, {
    key: "getSelectedVariantId",
    value: function getSelectedVariantId(modal, target) {
      var selectedColor = modal.querySelector('.variant-selector.color .selected');
      var selectedSize = modal.querySelector('.variant-selector.size .selected');
      if (selectedColor) selectedColor = selectedColor.dataset.value;
      if (selectedSize) selectedSize = selectedSize.dataset.value;
      var parent = target;

      while (!parent.classList.contains('variant-selector')) {
        parent = parent.parentElement;
      }

      if (parent.classList.contains('color')) {
        selectedColor = target.dataset.value;
        parent.querySelectorAll('.options-container div').forEach(function (el) {
          el.classList.remove('selected');
        });
        parent.querySelector('h6 span').innerText = selectedColor;
        target.classList.add('selected');
      } else if (parent.classList.contains('size')) {
        selectedSize = target.dataset.value;
        parent.querySelector('.dropdown .value').innerText = target.innerText;
      }

      var variants = modal.querySelector('form select[name="id"]').options;
      var variantSize = variants.length;

      for (var i = 0; i < variantSize; i++) {
        if (selectedColor && !variants[i].text.includes(selectedColor)) {
          continue;
        }

        if (selectedSize && !variants[i].text.includes(selectedSize)) {
          continue;
        }

        variants[i].selected = true;
        return variants[i].value;
      }
    }
    /**
     * Dynamically change modal content based on selected variant
     */

  }, {
    key: "previewVariant",
    value: function previewVariant(modal, target, variantId) {
      var _this2 = this;

      if (!variantId) {
        variantId = this.getSelectedVariantId(modal, target);
      } else {
        // Update variant selector selected value
        var selectedIdOptions = modal.querySelector('form select[name="id"]').options;
        var optionSize = selectedIdOptions.length;
        var selectedVariant;

        for (var i = 0; i < optionSize; i++) {
          if (selectedIdOptions[i].value === variantId) {
            selectedIdOptions[i].selected = true;
            selectedVariant = selectedIdOptions[i].innerText;
          }
        }

        var color = modal.querySelector('.variant-selector.color');

        if (color) {
          var colorOptions = color.querySelectorAll('.options-container div');
          color.querySelector('h6 span').innerText = selectedVariant;
          colorOptions.forEach(function (el) {
            if (el.dataset.value === selectedVariant) {
              el.classList.add('selected');
            } else el.classList.remove('selected');
          });
        }

        var size = modal.querySelector('.variant-selector.size');

        if (size) {
          size.querySelector('.dropdown .value').innerText = selectedVariant;
        }
      }

      var productName = modal.querySelector('.hero-desc--container h1').innerText;
      var images = document.querySelector("#modal-img-".concat(variantId)).value.split('|');
      var summary = document.querySelector("#modal-summary-".concat(variantId)).value;
      var price = document.querySelector("#modal-price-".concat(variantId)).value;
      var isAvailable = price !== 'unavailable';
      var ssprice = document.querySelector("#modal-ssprice-".concat(variantId));
      if (ssprice) ssprice = ssprice.value; // Update images

      modal.querySelector('.hero-selected-img').src = images[0];
      var thumbnailContainer = modal.querySelector('.hero-carousel');

      while (thumbnailContainer.firstChild) {
        thumbnailContainer.removeChild(thumbnailContainer.firstChild);
      }

      images.forEach(function (image, index) {
        var img = document.createElement('img');
        img.setAttribute('src', "//images.accentuate.io?c_options=w_132&image=".concat(image));
        img.setAttribute('data-src', image);
        img.setAttribute('alt', "".concat(productName, " thumbnail ").concat(index));
        thumbnailContainer.appendChild(img);
      }); // Update summary

      modal.querySelector('.hero-desc--container .summary').innerText = summary; // Update add to cart button

      var addToCartButton = modal.querySelector('.product-form--submit button');

      if (!isAvailable) {
        addToCartButton.innerHTML = 'Out of Stock';
        addToCartButton.disabled = true;
      } else {
        addToCartButton.innerHTML = "\n        Add To Cart - <span class=\"price\">".concat(price, "</span>\n        ").concat(ssprice ? "<span class=\"ss-price\">".concat(ssprice, "</span>") : '', "\n      ");
        addToCartButton.disabled = false;
      } // Re-attach event listener for newly added elements


      var thumbnails = modal.querySelectorAll('.hero-carousel img');
      thumbnails.forEach(function (thumbnail) {
        thumbnail.addEventListener('click', _this2.swapHeroImage.bind(_this2));
      });
    }
    /**
     * Toggle size selector dropdown on desktop
     */

  }, {
    key: "toggleSizeVariantDropdown",
    value: function toggleSizeVariantDropdown(modal, e) {
      e.stopPropagation();
      var el = modal.querySelector('.variant-selector.size .options-container');
      el.classList.toggle('show');
    }
    /**
     * Set ReCharge product properties to Buy Once
     */

  }, {
    key: "handleBuyOnce",
    value: function handleBuyOnce(modal, e) {
      e.stopPropagation();
      var subscribeOnceButton = modal.querySelector('.subs-container .buttons .once');
      var subscribeAutoButton = modal.querySelector('.subs-container .buttons .freq');
      var purchaseType = modal.querySelector('form [name="purchase_type"]');
      var shippingIntervalUnit = modal.querySelector('form .shipping_interval_unit_type');
      var shippingIntervalFrequency = modal.querySelector('form .shipping_interval_frequency');
      purchaseType.value = 'onetime';
      shippingIntervalUnit.setAttribute('name', '');
      shippingIntervalFrequency.setAttribute('name', '');
      modal.classList.remove('ss-active');
      subscribeOnceButton.classList.add('active');
      subscribeAutoButton.classList.remove('active');
      var label = subscribeAutoButton.querySelector('.label');
      label.innerHTML = label.getAttribute('data-default');
    }
    /**
     * Set ReCharge product properties to Subscribe
     */

  }, {
    key: "handleBuyAuto",
    value: function handleBuyAuto(modal, e) {
      e.stopPropagation();
      var subscribeAutoButton = modal.querySelector('.subs-container .buttons .freq');
      var subscriptionOptions = modal.querySelector('.frequency-options');
      subscribeAutoButton.querySelector('svg').classList.toggle('show');
      subscriptionOptions.classList.toggle('show');
    }
    /**
     * Update subscription frequency property based on selected option
     */

  }, {
    key: "handleFrequencyChange",
    value: function handleFrequencyChange(modal, e) {
      var subscribeOnceButton = modal.querySelector('.subs-container .buttons .once');
      var subscribeAutoButton = modal.querySelector('.subs-container .buttons .freq');
      var purchaseType = modal.querySelector('form [name="purchase_type"]');
      var shippingIntervalUnit = modal.querySelector('form .shipping_interval_unit_type');
      var shippingIntervalFrequency = modal.querySelector('form .shipping_interval_frequency');
      subscribeOnceButton.classList.remove('active');
      subscribeAutoButton.classList.add('active');
      modal.classList.add('ss-active');
      purchaseType.value = 'autodeliver';
      shippingIntervalUnit.setAttribute('name', "properties[shipping_interval_unit_type]");
      shippingIntervalFrequency.setAttribute('name', "properties[shipping_interval_frequency]");
      shippingIntervalFrequency.value = e.target.getAttribute('data-value');
      subscribeAutoButton.querySelector('.label').innerText = e.currentTarget.innerText;
    }
    /**
     * Handle add to cart button using Shopify Ajax API
     */

  }, {
    key: "submitOrder",
    value: function submitOrder(modal, e) {
      e.preventDefault();
      var variantId;
      var properties;
      var purchaseType = modal.querySelector('form [name="purchase_type"]');
      var shippingIntervalUnit = modal.querySelector('form .shipping_interval_unit_type');
      var shippingIntervalFrequency = modal.querySelector('form .shipping_interval_frequency');
      var variants = modal.querySelector('form select[name="id"]');
      var isSubscription = purchaseType.value === 'autodeliver';
      var selectedVariantIndex = variants.selectedIndex;
      var variantOptions = variants.options;

      if (isSubscription) {
        variantId = variantOptions[selectedVariantIndex].dataset.value;
        properties = {
          shipping_interval_frequency: shippingIntervalFrequency.value,
          shipping_interval_unit_type: shippingIntervalUnit.value
        };
      } else {
        variantId = variantOptions[selectedVariantIndex].value;
      }

      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: 1,
          id: variantId,
          properties: properties
        })
      }).then(function (res) {
        if (res.ok) return res.json();else throw Error("Request rejected with status ".concat(res.status));
      }).then(function (res) {
        // Close quickview modal
        modal.classList.add('out');
        setTimeout(function () {
          modal.style.display = 'none';
          modal.classList.remove('out');
        }, 250); // Show mini-cart

        Object(_updateCart__WEBPACK_IMPORTED_MODULE_0__["initializeCart"])();
        //document.body.classList.add('cart-open');
        //document.getElementById('shopify-section-cart').classList.add('show');
      }).catch(console.log);
    }
  }]);

  return QuickView;
}();



/***/ }),

/***/ "./src/js/constants/breakpoints.js":
/*!*****************************************!*\
  !*** ./src/js/constants/breakpoints.js ***!
  \*****************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = ({
  xs: 480,
  sm: 768,
  md: 992,
  lg: 1200,
  xl: 1920
});

/***/ }),

/***/ "./src/js/index.js":
/*!*************************!*\
  !*** ./src/js/index.js ***!
  \*************************/
/*! no exports provided */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _css_index_scss__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../css/index.scss */ "./src/css/index.scss");
/* harmony import */ var _css_index_scss__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_css_index_scss__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _components_menuBar__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./components/menuBar */ "./src/js/components/menuBar.js");
/* harmony import */ var _components_banner__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./components/banner */ "./src/js/components/banner.js");
/* harmony import */ var _components_banner__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_components_banner__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _components_cartDrawer__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./components/cartDrawer */ "./src/js/components/cartDrawer.js");
/* harmony import */ var _components_footer__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./components/footer */ "./src/js/components/footer.js");
/* harmony import */ var _page_captcha__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./page/captcha */ "./src/js/page/captcha.js");
/* harmony import */ var _page_home__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./page/home */ "./src/js/page/home.js");
/* harmony import */ var _page_plp__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./page/plp */ "./src/js/page/plp.js");
/* harmony import */ var _page_pdp__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./page/pdp */ "./src/js/page/pdp.js");
/* harmony import */ var _page_cart__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./page/cart */ "./src/js/page/cart.js");
/* harmony import */ var _page_aboutUs__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./page/aboutUs */ "./src/js/page/aboutUs.js");
/* harmony import */ var _page_ourPeople__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./page/ourPeople */ "./src/js/page/ourPeople.js");
/* harmony import */ var _page_login__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./page/login */ "./src/js/page/login.js");
/* harmony import */ var _page_resetPassword__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./page/resetPassword */ "./src/js/page/resetPassword.js");
/* harmony import */ var _page_faqs__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./page/faqs */ "./src/js/page/faqs/index.js");
/* harmony import */ var _page_contact__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./page/contact */ "./src/js/page/contact/index.js");
/* harmony import */ var _components_parallax_parallaxController__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./components/parallax/parallaxController */ "./src/js/components/parallax/parallaxController.js");
/* harmony import */ var _page_customers_account__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./page/customers/account */ "./src/js/page/customers/account/index.js");
/* harmony import */ var _page_customers_addresses__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./page/customers/addresses */ "./src/js/page/customers/addresses/index.js");
/* harmony import */ var _page_re_charge__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./page/re-charge */ "./src/js/page/re-charge/index.js");
/* harmony import */ var _page_product_reviews_add_product_title__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./page/product/reviews-add-product-title */ "./src/js/page/product/reviews-add-product-title.js");
/* harmony import */ var _page_product_reviews_add_product_title__WEBPACK_IMPORTED_MODULE_20___default = /*#__PURE__*/__webpack_require__.n(_page_product_reviews_add_product_title__WEBPACK_IMPORTED_MODULE_20__);





















document.addEventListener('DOMContentLoaded', function (e) {
  var menuBar = new _components_menuBar__WEBPACK_IMPORTED_MODULE_1__["default"]();
  var cartDrawer = new _components_cartDrawer__WEBPACK_IMPORTED_MODULE_3__["default"]();
  var footer = new _components_footer__WEBPACK_IMPORTED_MODULE_4__["default"]();
  var parallaxController = new _components_parallax_parallaxController__WEBPACK_IMPORTED_MODULE_16__["default"]('.parallax');
  var aboutUs = new _page_aboutUs__WEBPACK_IMPORTED_MODULE_10__["default"]();
  var captcha = new _page_captcha__WEBPACK_IMPORTED_MODULE_5__["default"](); // Home

  document.body.classList.contains('index') && new _page_home__WEBPACK_IMPORTED_MODULE_6__["default"](); // PLP

  document.body.className.indexOf('collection') >= 0 && new _page_plp__WEBPACK_IMPORTED_MODULE_7__["default"](); // Product

  document.body.classList.contains('product') && new _page_pdp__WEBPACK_IMPORTED_MODULE_8__["default"](); // Cart

  document.body.classList.contains('cart') && new _page_cart__WEBPACK_IMPORTED_MODULE_9__["default"](); // Login

  document.body.classList.contains('customers-login') && new _page_login__WEBPACK_IMPORTED_MODULE_12__["default"](); // Reset Password

  document.body.classList.contains('customers-reset_password') && new _page_resetPassword__WEBPACK_IMPORTED_MODULE_13__["default"](); // Our People

  document.body.classList.contains('page-our-people') && new _page_ourPeople__WEBPACK_IMPORTED_MODULE_11__["default"](); // FAQs

  document.body.classList.contains('page-faq') && Object(_page_faqs__WEBPACK_IMPORTED_MODULE_14__["default"])(); // Contact

  document.body.classList.contains('page-contact') && Object(_page_contact__WEBPACK_IMPORTED_MODULE_15__["default"])(); // Customer Account

  document.body.classList.contains('customers-account') && Object(_page_customers_account__WEBPACK_IMPORTED_MODULE_17__["default"])(); // Customer Addresses

  document.body.classList.contains('customers-addresses') && Object(_page_customers_addresses__WEBPACK_IMPORTED_MODULE_18__["default"])(); // ReCharge

  window.location.pathname.startsWith('/tools/recurring/') && Object(_page_re_charge__WEBPACK_IMPORTED_MODULE_19__["default"])();
});

/***/ }),

/***/ "./src/js/page/aboutUs.js":
/*!********************************!*\
  !*** ./src/js/page/aboutUs.js ***!
  \********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return AboutUs; });
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lodash.debounce */ "./node_modules/lodash.debounce/index.js");
/* harmony import */ var lodash_debounce__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash_debounce__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var smoothscroll_polyfill__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! smoothscroll-polyfill */ "./node_modules/smoothscroll-polyfill/dist/smoothscroll.js");
/* harmony import */ var smoothscroll_polyfill__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(smoothscroll_polyfill__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _utils_mediaQuery__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/mediaQuery */ "./src/js/utils/mediaQuery.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }





var AboutUs = /*#__PURE__*/function () {
  function AboutUs() {
    var _this = this;

    _classCallCheck(this, AboutUs);

    this.aboutUs = document.querySelector('main.about-us');
    this.yearSelectors = document.querySelectorAll('.about-us .timeline .year-select');
    this.yearDropdowns = document.querySelectorAll('.about-us .timeline .drop-down');
    this.yearDropdownOptions = document.querySelectorAll('.about-us .timeline .drop-down li');

    if (this.aboutUs) {
      this.aboutUs.addEventListener('click', this.hideAllYearDropdown.bind(this));
      this.yearSelectors.forEach(function (button) {
        button.addEventListener('click', _this.displayYearDropdown.bind(_this));
      });
      this.yearDropdownOptions.forEach(function (el) {
        el.addEventListener('click', _this.jumpToSection.bind(_this));
      });
      window.addEventListener('resize', lodash_debounce__WEBPACK_IMPORTED_MODULE_0___default()(function () {
        _this.repositionDropdown();
      }, 400));
      smoothscroll_polyfill__WEBPACK_IMPORTED_MODULE_1___default.a.polyfill();
      this.repositionDropdown();
    }
  }

  _createClass(AboutUs, [{
    key: "repositionDropdown",
    value: function repositionDropdown() {
      this.yearDropdowns.forEach(function (el) {
        var index = el.dataset.index;

        if (Object(_utils_mediaQuery__WEBPACK_IMPORTED_MODULE_2__["isDown"])('sm')) {
          el.style.top = "".concat(361 - 42 * index, "px");
        } else if (Object(_utils_mediaQuery__WEBPACK_IMPORTED_MODULE_2__["isDown"])('lg')) {
          el.style.top = "".concat(461 - 46 * index, "px");
        } else {
          el.style.top = "".concat(40 - 43 * index, "px");
        }
      });
    }
  }, {
    key: "displayYearDropdown",
    value: function displayYearDropdown(e) {
      e.stopPropagation();
      var parent = e.target;

      while (!parent.classList.contains('year-select')) {
        parent = parent.parentElement;
      }

      var dropdownEl = parent.nextElementSibling;
      dropdownEl.classList.add('show');
    }
  }, {
    key: "hideAllYearDropdown",
    value: function hideAllYearDropdown(e) {
      this.yearDropdowns.forEach(function (el) {
        el.classList.remove('show');
      });
    }
  }, {
    key: "jumpToSection",
    value: function jumpToSection(e) {
      var target = e.target.dataset.jumpto;
      var elementY = window.pageYOffset + document.getElementById(target).getBoundingClientRect().top; // Add offset if there is global banner

      var offset = 0;
      var globalBanner = document.querySelector('body .banner');

      if (globalBanner) {
        if (Object(_utils_mediaQuery__WEBPACK_IMPORTED_MODULE_2__["isDown"])('lg')) {
          offset = 64;
        } else {
          offset = 58;
        }
      } // Add another offset if scrolling up for the nav


      var isScrollUp = elementY < window.pageYOffset;

      if (isScrollUp) {
        if (Object(_utils_mediaQuery__WEBPACK_IMPORTED_MODULE_2__["isDown"])('sm')) {
          offset += 54;
        } else if (Object(_utils_mediaQuery__WEBPACK_IMPORTED_MODULE_2__["isDown"])('lg')) {
          offset += 72;
        } else {
          offset += 82;
        }
      }

      elementY -= offset;
      window.scroll({
        top: elementY,
        behavior: 'smooth'
      });
    }
  }]);

  return AboutUs;
}();



/***/ }),

/***/ "./src/js/page/captcha.js":
/*!********************************!*\
  !*** ./src/js/page/captcha.js ***!
  \********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Captcha; });
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Captcha = function Captcha() {
  _classCallCheck(this, Captcha);

  this.recaptcha = document.getElementById('g-recaptcha');
  this.redirectUrl = sessionStorage.getItem('redirect-url');

  if (this.recaptcha && this.redirectUrl) {
    // Redirect user to specified page on sucess
    var captchaForm = document.querySelector('.shopify-challenge__container form');
    var submitCaptcha = captchaForm.querySelector('input[type="submit"]');
    var input = document.createElement('input');
    input.setAttribute('type', 'hidden');
    input.setAttribute('name', 'return_to');
    input.setAttribute('value', this.redirectUrl);
    captchaForm.insertBefore(input, submitCaptcha); // Clear session

    sessionStorage.removeItem('redirect-url');
  }
};



/***/ }),

/***/ "./src/js/page/cart.js":
/*!*****************************!*\
  !*** ./src/js/page/cart.js ***!
  \*****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Cart; });
/* harmony import */ var _updateCart__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../updateCart */ "./src/js/updateCart.js");
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }



var Cart = /*#__PURE__*/function () {
  function Cart() {
    var _this = this;

    _classCallCheck(this, Cart);
    
    this.cart = document.querySelector('.cart-drawer-container.full-page');
    this.currency = this.cart.dataset.currency;
    this.itemContainer = this.cart.querySelector('.cart-container .items');
    this.orderSummaryEl = this.cart.querySelector('footer');
    this.cartCountEl = this.cart.querySelector('.header h1 span');
    this.subtotalEl = this.cart.querySelector('.subtotal p');
    this.minusButtons = this.cart.querySelectorAll('button.minus');
    this.plusButtons = this.cart.querySelectorAll('button.plus');
    
    this.minusButtons.forEach(function (button) {
      button.addEventListener('click', _this.updateLineItemQuantity.bind(_this, '-'));
    });
    this.plusButtons.forEach(function (button) {
      button.addEventListener('click', _this.updateLineItemQuantity.bind(_this, '+'));
    });
  }

  _createClass(Cart, [{
    key: "updateLineItemQuantity",
    value: function updateLineItemQuantity(operant, e) {
      var el = e.target;

      while (!el.classList.contains('line-item')) {
        el = el.parentElement;
      }

      var variantId = el.dataset.id;
      var countEl = el.querySelector('.adjust-quantity p');
      var unitPriceEl = el.querySelector('.unit-price');
      var count, newValue, newValueStr;

      if (operant === '-') {
        count = parseInt(countEl.innerText) - 1;
        
        //Test1At
         
        var testb = $('.line-item ').attr('data-id');
       var User_Id=  document.getElementById("custtest").innerText;
      } else if (operant === '+') {
        count = parseInt(countEl.innerText) + 1;
        
        //Test2At
          var testb = $('.line-item ').attr('data-id');
       var User_Id=  document.getElementById("custtest").innerText;
      }
      
      fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          updates: _defineProperty({}, variantId, count)
        })
      }).then(function (res) {
        location.reload();
        if (res.ok) return res.json();else throw Error("Request rejected with status ".concat(res.status));
      }).then(function (res) {
        Object(_updateCart__WEBPACK_IMPORTED_MODULE_0__["initializeCart"])();
      });
      
      console.log(count)
    }
  }, {
    key: "addFreeSample",
    value: function addFreeSample(e) {
      var target = e.target;
      var freeSampleContainer = document.querySelector('.cart-drawer-container .free-sample'); // Disable add free sample button if one already added

      freeSampleContainer.classList.add('hidden');

      while (!target.classList.contains('item')) {
        target = target.parentElement;
      }

      var variantId = target.dataset.id;
      fetch('/cart.js', {
        method: 'GET'
      }).then(function (res) {
        return res.json();
      }).then(function (res) {
        // Check if free sample is already added
        var freeSampleExists = false;
        res.items.forEach(function (item) {
          if (item.properties) {
            if (item.properties.free_sample === true) freeSampleExists = true;
          }
        });
        return freeSampleExists;
      }).then(function (freeSampleExists) {
        // Only add free sample only if there is none
        if (!freeSampleExists) {
          fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              quantity: 1,
              id: variantId,
              properties: {
                free_sample: true
              }
            })
          }).then(function (res) {
            if (res.ok) return res.json();else throw Error("Request rejected with status ".concat(res.status));
          }).then(function () {
            location.reload();
          }).catch(console.log);
        }
      }).catch(console.log);
    }
  }]);

  return Cart;
}();



/***/ }),

/***/ "./src/js/page/contact/index.js":
/*!**************************************!*\
  !*** ./src/js/page/contact/index.js ***!
  \**************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var utils_form_validator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! utils/form-validator */ "./src/js/utils/form-validator.js");

/* harmony default export */ __webpack_exports__["default"] = (function () {
  // Init form validator
  new utils_form_validator__WEBPACK_IMPORTED_MODULE_0__["default"](document.getElementById('contact_form'));
});

/***/ }),

/***/ "./src/js/page/customers/account/index.js":
/*!************************************************!*\
  !*** ./src/js/page/customers/account/index.js ***!
  \************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var CustomersAccountPage = function CustomersAccountPage() {
  _classCallCheck(this, CustomersAccountPage);
};

/* harmony default export */ __webpack_exports__["default"] = (function () {
  new CustomersAccountPage();
});

/***/ }),

/***/ "./src/js/page/customers/addresses/index.js":
/*!**************************************************!*\
  !*** ./src/js/page/customers/addresses/index.js ***!
  \**************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var AddressesPage = /*#__PURE__*/function () {
  function AddressesPage() {
    var _this = this;

    _classCallCheck(this, AddressesPage);

    _defineProperty(this, "handleEditClick", function (e) {
      e.preventDefault();
      var formId = e.currentTarget.getAttribute('data-form-id');

      _this.activateEdit(formId);
    });

    _defineProperty(this, "handleDeleteClick", function (e) {
      e.preventDefault();
      var addressUrl = e.currentTarget.getAttribute('data-address-url');

      if (confirm('Are you sure you wish to delete this address?')) {
        Shopify.postLink(addressUrl, {
          parameters: {
            _method: 'delete'
          }
        });
      }
    });

    document.querySelectorAll('.form-wrap > form').forEach(function (form) {
      var countrySelector = form.querySelector('[name="address[country]"]').id;
      var provinceSelector = form.querySelector('[name="address[province]"]').id;
      var containerSelector = form.querySelector('.province-wrap').id;
      new window.Shopify.CountryProvinceSelector(countrySelector, provinceSelector, {
        hideElement: containerSelector
      });
    });
    document.querySelectorAll('.address-edit-link').forEach(function (elem) {
      return elem.addEventListener('click', _this.handleEditClick);
    });
    document.querySelectorAll('.address-delete-link').forEach(function (elem) {
      return elem.addEventListener('click', _this.handleDeleteClick);
    });
  }

  _createClass(AddressesPage, [{
    key: "activateEdit",
    value: function activateEdit(formId) {
      document.querySelector('.address-list').style.display = 'none';
      document.querySelector('button[data-form-id="new"]').style.display = 'none';
      document.querySelector(".form-wrap[data-form=\"".concat(formId, "\"]")).style.display = 'block';
      document.querySelector('.general-link.go-back').style.display = 'block';
    }
  }]);

  return AddressesPage;
}();

/* harmony default export */ __webpack_exports__["default"] = (function () {
  new AddressesPage();
});

/***/ }),

/***/ "./src/js/page/faqs/index.js":
/*!***********************************!*\
  !*** ./src/js/page/faqs/index.js ***!
  \***********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var FAQS = /*#__PURE__*/function () {
  function FAQS() {
    var _this = this;

    _classCallCheck(this, FAQS);

    _defineProperty(this, "changeSection", function (idx) {
      // Set active class to section
      _this.sectionsLinks.forEach(function (elem) {
        return elem.classList[FAQS.elemGetSectionId(elem) === idx ? 'add' : 'remove']('active');
      }); // Change select value


      _this.sectionSelect.value = idx; // Update lists

      _this.lists.forEach(function (elem) {
        var isTarget = FAQS.elemGetSectionId(elem) === idx;
        elem.classList[isTarget ? 'add' : 'remove']('active'); // Close all entries

        if (isTarget) {
          elem.querySelectorAll('.faq-entry').forEach( // Open first one
          function (elem, idx) {
            return elem.classList[idx === 0 ? 'add' : 'remove']('open');
          });
        }
      });
    });

    _defineProperty(this, "handleSectionClick", function (e) {
      e.preventDefault();

      _this.changeSection(FAQS.elemGetSectionId(e.currentTarget));
    });

    _defineProperty(this, "handleSectionSelect", function (e) {
      e.preventDefault();

      _this.changeSection(_this.sectionSelect.value);
    });

    this.lists = document.querySelectorAll('.faq-entries-list');
    this.sectionsLinks = document.querySelectorAll('.faq-section-title');
    this.sectionSelect = document.querySelector('.faq-section-select'); // Section click handler

    this.sectionsLinks.forEach(function (elem) {
      return elem.addEventListener('click', _this.handleSectionClick);
    }); // Section Select handler

    this.sectionSelect.addEventListener('change', this.handleSectionSelect); // Entry toggle handler

    this.lists.forEach(function (listElem) {
      return listElem.querySelectorAll('.faq-entry').forEach(function (entryElem) {
        return entryElem.addEventListener('click', _this.toggleEntry);
      });
    });
  }

  _createClass(FAQS, [{
    key: "toggleEntry",
    value: function toggleEntry(e) {
      e.preventDefault(); // Prevent toggle on text selection

      if (window.getSelection && typeof window.getSelection === 'function' && window.getSelection().toString()) {
        return;
      }

      e.currentTarget.classList.toggle('open');
    }
  }]);

  return FAQS;
}();

_defineProperty(FAQS, "elemGetSectionId", function (elem) {
  return elem.getAttribute('data-section-idx');
});

/* harmony default export */ __webpack_exports__["default"] = (function () {
  return new FAQS();
});

/***/ }),

/***/ "./src/js/page/home.js":
/*!*****************************!*\
  !*** ./src/js/page/home.js ***!
  \*****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Home; });
/* harmony import */ var _components_quickView__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../components/quickView */ "./src/js/components/quickView.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Home = /*#__PURE__*/function () {
  function Home() {
    var _this = this;

    _classCallCheck(this, Home);

    this.quickViewModals = new _components_quickView__WEBPACK_IMPORTED_MODULE_0__["default"]('.modal');
    this.openQuickViewModalBtns = document.querySelectorAll('.quick-view button');
    this.featuredCollectionQuickview = document.querySelectorAll('.home-collections button.quick-view');
    this.init();
    this.openQuickViewModalBtns.forEach(function (button) {
      button.addEventListener('click', _this.displayQuickViewModal.bind(_this));
    });

    if (this.featuredCollectionQuickview) {
      this.featuredCollectionQuickview.forEach(function (button) {
        button.addEventListener('click', _this.displayQuickViewModal.bind(_this));
      });
    }
  }

  _createClass(Home, [{
    key: "init",
    value: function init() {
      var _this2 = this;
		
      // Pick random image for Process section
      var processImage = homeProcessImages[Math.floor(Math.random() * homeProcessImages.length)];
      var processImageEl = document.querySelector('.home-process > img');
      processImageEl.src = processImage.cloudinary_src + 'w_640';
      processImageEl.srcset = "\n      ".concat(processImage.cloudinary_src + 'w_1920', " 1920w,\n      ").concat(processImage.cloudinary_src + 'w_1024', " 1024w,\n      ").concat(processImage.cloudinary_src + 'w_640', " 640w,\n    "); // Initialize carousels

      var flktyFeaturedCarousel;

    }
    
  }, {
    key: "displayQuickViewModal",
    value: function displayQuickViewModal(e) {
      e.preventDefault();
      var target = e.target;

      while (!target.classList.contains('quick-view')) {
        target = target.parentElement;
      }

      var productId = target.dataset.productid;
      var variantId = target.dataset.variantid;
      var modal = document.getElementById("quick-view-".concat(productId));
      this.quickViewModals.previewVariant(modal, undefined, variantId);
      modal.style.display = 'flex';
    }
  }]);

  return Home;
}();



/***/ }),

/***/ "./src/js/page/login.js":
/*!******************************!*\
  !*** ./src/js/page/login.js ***!
  \******************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Login; });
/* harmony import */ var utils_form_validator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! utils/form-validator */ "./src/js/utils/form-validator.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }



var Login = /*#__PURE__*/function () {
  function Login() {
    var _this = this,
        _arguments = arguments;

    _classCallCheck(this, Login);

    this.forms = document.querySelectorAll('.customers-login main form');
    this.forgotPwdBtn = document.querySelector('.customers-login .forgot-pwd');
    this.isResetPwdSuccess = document.querySelector('.customers-login .reset-password-success');
    this.registerBtn = document.querySelector('#create_customer input[type="submit"]');
    this.modal = document.querySelector('.customers-login .modal');
    this.modalContent = this.modal.querySelector('.content');
    this.closeModalBtn = this.modal.querySelector('.close-modal');
    this.forgotPwdBtn.addEventListener('click', this.showRecoverPwdForm.bind(this));
    this.registerBtn.addEventListener('click', function () {
      return sessionStorage.setItem('redirect-url', '/account');
    });
    this.modal.addEventListener('click', function (e) {
      _this.closeModal(e.target);
    });
    this.modalContent.addEventListener('click', function (e) {
      e.stopPropagation();
    });
    this.closeModalBtn.addEventListener('click', function (e) {
      var rootEl = e.target; // Find the root modal

      while (!rootEl.classList.contains('modal')) {
        rootEl = rootEl.parentElement;
      }

      _this.closeModal(rootEl);
    });

    if (this.isResetPwdSuccess) {
      this.showRecoverPwdForm();
      this.modal.style.display = 'flex';
    }

    new utils_form_validator__WEBPACK_IMPORTED_MODULE_0__["default"](document.getElementById('customer_login'), function () {
      console.log(_arguments);
    });
    new utils_form_validator__WEBPACK_IMPORTED_MODULE_0__["default"](document.getElementById('#create_customer'), function () {
      console.log(_arguments);
    });
    new utils_form_validator__WEBPACK_IMPORTED_MODULE_0__["default"](document.getElementById('forgot_password'), function () {
      console.log(_arguments);
    });
  }

  _createClass(Login, [{
    key: "showRecoverPwdForm",
    value: function showRecoverPwdForm() {
      this.forms.forEach(function (form) {
        form.classList.add('hidden');
      });
      document.getElementById('forgot_password').classList.remove('hidden');
    }
  }, {
    key: "closeModal",
    value: function closeModal(el) {
      el.classList.add('out');
      setTimeout(function () {
        el.style.display = 'none';
        el.classList.remove('out');
      }, 250);
    }
  }]);

  return Login;
}();



/***/ }),

/***/ "./src/js/page/ourPeople.js":
/*!**********************************!*\
  !*** ./src/js/page/ourPeople.js ***!
  \**********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return OurPeople; });
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var OurPeople = function OurPeople() {
  var _this = this;
  _classCallCheck(this, OurPeople);
};



/***/ }),

/***/ "./src/js/page/pdp.js":
/*!****************************!*\
  !*** ./src/js/page/pdp.js ***!
  \****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Pdp; });
/* harmony import */ var lodash_throttle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lodash.throttle */ "./node_modules/lodash.throttle/index.js");
/* harmony import */ var lodash_throttle__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash_throttle__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _updateCart__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../updateCart */ "./src/js/updateCart.js");
/* harmony import */ var _utils_mediaQuery__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../utils/mediaQuery */ "./src/js/utils/mediaQuery.js");
/* harmony import */ var _utils_lineClamp__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../utils/lineClamp */ "./src/js/utils/lineClamp.js");
/* harmony import */ var _components_quickView__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../components/quickView */ "./src/js/components/quickView.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }







var Pdp = /*#__PURE__*/function () {
  function Pdp() {
    var _this = this;

    _classCallCheck(this, Pdp);

    this.body = document.querySelector('body');
    this.mainNavbar = document.getElementById('shopify-section-menu-bar');
    this.pdpStickyNav = document.getElementById('pdp-sticky-nav');
    this.heroSelectedImg = document.querySelectorAll('#pdp-hero .hero-selected-img');
    this.heroThumbnails = document.querySelectorAll('#pdp-hero .hero-carousel img');
    this.heroSubsContainer = document.querySelector('#pdp-hero .subs-container');
    this.heroSubOnceButton = document.querySelector('#pdp-hero .subs-container .buttons .once');
    this.heroSubFreqButton = document.querySelector('#pdp-hero .subs-container .buttons .freq');
    this.heroFreqOptionsContainer = document.querySelector('#pdp-hero .frequency-options');
    this.heroFreqOptions = document.querySelectorAll('#pdp-hero .frequency-options [data-value]');
    this.mobileVariantSelectors = document.querySelectorAll('.mobile-variant-selector');
    this.sizeVariantSelector = document.querySelector('#pdp-hero .variant-selector.size .dropdown');
    this.variantOptions = document.querySelectorAll('#pdp-hero .variant-selector .options-container div');

    if (document.getElementById('order-submit')) {
      this.heroSubmitOrderBtn = document.getElementById('order-submit');
    }

    this.navSubmitOrderBtn = document.querySelector('#pdp-sticky-nav button');
    this.form = document.querySelector('form.propduct_form');
    this.input_purchase_type = this.form.querySelector('[name="purchase_type"]');
    this.input_shipping_interval_unit_type = this.form.querySelector('#shipping_interval_unit_type');
    this.input_shipping_interval_frequency = this.form.querySelector('#shipping_interval_frequency');

    if (document.querySelector('#pdp-ingredient')) {
      this.ingredientArticle = document.querySelector('#pdp-ingredient .article');
      this.ingredientViewAll = this.ingredientArticle.querySelector('button');
      this.ingredientModal = this.ingredientArticle.querySelector('.ingredient-modal');
    }

    this.youtubeLink = document.querySelector('.steps-img--container input');
    this.youtubePlayer = document.querySelector('.steps-img--container iframe');
    this.routineAddToCartBtn = document.querySelector('#pdp-routine .routine-copy .add-to-cart');
    this.routineProducts = document.querySelectorAll('#pdp-routine .product-item');
    this.routineQuickViewBtn = document.querySelectorAll('#pdp-routine .product-item .thumbnail button');
    this.modals = document.querySelectorAll('.modal');
    this.modalContent = document.querySelectorAll('.modal .content');
    this.closeModalBtn = document.querySelectorAll('.modal .content .close-modal');

    
    if (document.querySelector('#pdp-ingredient')) {
      this.ingredientModuleY = window.pageYOffset + document.getElementById('pdp-ingredient').getBoundingClientRect().top;
    }

    this.lastScroll = window.pageYOffset; // --------------- Initialize carousels --------------- //

    this.flktyIngredient;

    if (this.youtubeLink) {
      // Strip video ID from youtube url
      var regex = /[a-zA-Z0-9]{8,}/;
      var videoId = youtubeLink.value.match(regex)[0];
      this.youtubePlayer.src = "https://www.youtube.com/embed/".concat(videoId);
    } // Initialize routine reviews


    window.addEventListener('scroll', lodash_throttle__WEBPACK_IMPORTED_MODULE_0___default()(function () {
      _this.switchNavbar();
    }, 400));
    this.body.addEventListener('click', function () {
      var sizeDropdown = document.querySelector('.variant-selector.size .options-container');

      if (sizeDropdown) {
        sizeDropdown.classList.remove('show');
      }

      if (_this.heroSubsContainer) {
        _this.heroSubsContainer.style.height = 'auto';

        _this.heroSubsContainer.querySelector('.frequency-options').classList.remove('show');

        _this.heroSubsContainer.querySelector('.freq svg').classList.remove('show');
      }
    }); // Popup modal

    this.modals.forEach(function (modal) {
      modal.addEventListener('click', function (e) {
        _this.closeModal(e.target);
      });
    });
    this.closeModalBtn.forEach(function (button) {
      button.addEventListener('click', function (e) {
        var rootEl = e.target; // Find the root modal

        while (!rootEl.classList.contains('modal')) {
          rootEl = rootEl.parentElement;
        }

        _this.closeModal(rootEl);
      });
    });
    this.modalContent.forEach(function (content) {
      content.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }); // Hero section

    var lineClamp = new _utils_lineClamp__WEBPACK_IMPORTED_MODULE_3__["default"]('.detail-line-clamp');
    this.heroSelectedImg.forEach(function (img) {
      img.addEventListener('load', _this.resetAnimation.bind(_this));
    });
    this.heroThumbnails.forEach(function (thumbnail) {
      thumbnail.addEventListener('click', _this.swapHeroImage.bind(_this));
    });

    if (this.heroSubsContainer) {
      this.heroSubOnceButton.addEventListener('click', this.rechargeBuyOnce.bind(this));
      this.heroSubFreqButton.addEventListener('click', this.rechargeAuto.bind(this));
      this.heroFreqOptions.forEach(function (option) {
        option.addEventListener('click', function (e) {
          _this.heroSubOnceButton.classList.remove('active');

          _this.heroSubFreqButton.classList.add('active');

          document.getElementById('pdp-sticky-nav').classList.add('ss-active');
          document.getElementById('pdp-hero').classList.add('ss-active');
          _this.input_purchase_type.value = 'autodeliver';

          _this.input_shipping_interval_unit_type.setAttribute('name', "properties[shipping_interval_unit_type]");

          _this.input_shipping_interval_frequency.setAttribute('name', "properties[shipping_interval_frequency]");

          _this.input_shipping_interval_frequency.value = e.currentTarget.getAttribute('data-value');
          _this.heroSubFreqButton.querySelector('.label').innerText = e.currentTarget.innerText;
        });
      });
    }

    if (this.mobileVariantSelectors) {
      this.mobileVariantSelectors.forEach(function (selector) {
        selector.addEventListener('click', _this.toggleMobileVariantSelector.bind(_this));
      });
    }

    if (this.sizeVariantSelector) {
      this.sizeVariantSelector.addEventListener('click', this.toggleSizeVariantSelector.bind(this));
    }

    if (this.variantOptions) {
      this.variantOptions.forEach(function (option) {
        option.addEventListener('click', _this.changeVariant.bind(_this));
      });
    }

    if (document.getElementById('order-submit')) {
      this.heroSubmitOrderBtn.addEventListener('click', this.submitOrder.bind(this));
    }

    this.navSubmitOrderBtn.addEventListener('click', this.submitOrder.bind(this)); // Ingredient section

    if (this.ingredientViewAll) {
      this.ingredientViewAll.addEventListener('click', function () {
        _this.ingredientModal.style.display = 'flex';
      });
    }

    var checkInvert = function checkInvert(carousel, index) {
      var cellEl = carousel.querySelectorAll('.carousel-cell')[index]; // Invert color

      if (cellEl.classList.contains('invert')) {
        document.querySelector('#pdp-ingredient .img-carousel').classList.add('invert');
      } else {
        document.querySelector('#pdp-ingredient .img-carousel').classList.remove('invert');
      }
    }; // Routine section


    var quickView = new _components_quickView__WEBPACK_IMPORTED_MODULE_4__["default"]('#pdp-routine .modal');

    if (this.routineAddToCartBtn) {
      this.routineAddToCartBtn.addEventListener('click', this.addAllToCart.bind(this));
    }

    this.routineQuickViewBtn.forEach(function (product) {
      product.addEventListener('click', _this.openRoutineModal.bind(_this));
    });

    
  } // --------------- Event handlers --------------- //

  	_createClass(Pdp, [{
    key: "switchNavbar",
    value: function switchNavbar(e) {
      if (Object(_utils_mediaQuery__WEBPACK_IMPORTED_MODULE_2__["isDown"])('lg')) return;
      var currentScroll = window.pageYOffset;

      if (!this.body.classList.contains('menu-open')) {
        if (currentScroll > this.lastScroll && currentScroll > this.ingredientModuleY) {
          // down
          this.pdpStickyNav.classList.add('scroll-down');
          this.pdpStickyNav.classList.remove('scroll-up');
        } else if (currentScroll < this.lastScroll) {
          // up
          this.pdpStickyNav.classList.add('scroll-up');
          this.pdpStickyNav.classList.remove('scroll-down');
        }
      }

      this.lastScroll = currentScroll <= 0 ? 0 : currentScroll;
    }
    /**
     * Close popup modal
     */

  }, {
    key: "closeModal",
    value: function closeModal(el) {
      el.classList.add('out');
      setTimeout(function () {
        el.style.display = 'none';
        el.classList.remove('out');
      }, 250);
    }
    /**
     * Reset animation
     */

  }, {
    key: "resetAnimation",
    value: function resetAnimation(e) {
      var el = e.target;
      el.style.animation = 'none';
      el.offsetHeight;
      el.style.animation = null;
    }
    /**
     * Switch selected image on hero module upon clicking thumbnail
     */

  }, {
    key: "swapHeroImage",
    value: function swapHeroImage(e) {
      var selectedImg = e.target;
      var imgSrc = e.target.dataset.src;
      var imgIndex = e.target.dataset.index;

      while (!selectedImg.classList.contains('hero-carousel')) {
        selectedImg = selectedImg.parentElement;
      }

      selectedImg = selectedImg.previousElementSibling;
      selectedImg.src = imgSrc;
      selectedImg.alt = selectedImg.dataset.alt + ' ' + imgIndex;
    }
    /**
     * Set ReCharge product properties to Buy Once
     */

  }, {
    key: "rechargeBuyOnce",
    value: function rechargeBuyOnce(e) {
      e.stopPropagation();
      this.input_purchase_type.value = 'onetime';
      this.input_shipping_interval_unit_type.setAttribute('name', '');
      this.input_shipping_interval_frequency.setAttribute('name', '');
      document.getElementById('pdp-sticky-nav').classList.remove('ss-active');
      document.getElementById('pdp-hero').classList.remove('ss-active');
      this.heroSubOnceButton.classList.add('active');
      this.heroSubFreqButton.classList.remove('active');
      var label = this.heroSubFreqButton.querySelector('.label');
      label.innerHTML = label.getAttribute('data-default');
    }
    /**
     * Set ReCharge product properties to Subscribe
     */

  }, {
    key: "rechargeAuto",
    value: function rechargeAuto(e) {
      e.stopPropagation();
      this.heroSubFreqButton.querySelector('svg').classList.toggle('show');
      this.heroFreqOptionsContainer.classList.toggle('show');
      var el = this.heroSubsContainer.querySelector('.buttons');
      var containerHeight = el.parentElement.style.height;

      if ((!containerHeight || containerHeight === 'auto') && Object(_utils_mediaQuery__WEBPACK_IMPORTED_MODULE_2__["isDown"])('sm')) {
        el.parentElement.style.height = "".concat(el.parentElement.scrollHeight - 18, "px");
      } else {
        el.parentElement.style.height = 'auto';
      }
    }
    /**
     * Toggle mobile variant selector panel
     */

  }, {
    key: "toggleMobileVariantSelector",
    value: function toggleMobileVariantSelector(e) {
      var el = e.target;

      while (!el.classList.contains('mobile-variant-selector')) {
        el = el.parentElement;
      }

      var colorPanel = document.querySelector('.variant-selector.color');
      var colorSelector = document.querySelector('.mobile-variant-selector.color');
      var sizePanel = document.querySelector('.variant-selector.size');
      var sizeSelector = document.querySelector('.mobile-variant-selector.size');

      if (el.classList.contains('color')) {
        // Toggle recharge selector
        if (this.heroSubsContainer) {
          if (colorPanel.classList.contains('hide')) {
            this.heroSubsContainer.classList.add('hide');
          } else {
            this.heroSubsContainer.classList.remove('hide');
          }
        } // Toggle color selector


        if (colorPanel && colorSelector) {
          colorPanel.classList.toggle('hide');
          colorSelector.classList.toggle('show');
        } // Toggle size selector


        if (sizePanel && sizeSelector) {
          sizePanel.classList.add('hide');
          sizeSelector.classList.remove('show');
        }
      } else if (el.classList.contains('size')) {
        // Toggle recharge selector
        if (this.heroSubsContainer) {
          if (sizePanel.classList.contains('hide')) {
            this.heroSubsContainer.classList.add('hide');
          } else {
            this.heroSubsContainer.classList.remove('hide');
          }
        } // Toggle color selector


        if (colorPanel && colorSelector) {
          colorPanel.classList.add('hide');
          colorSelector.classList.remove('show');
        } // Toggle size selector


        if (sizePanel && sizeSelector) {
          sizePanel.classList.toggle('hide');
          sizeSelector.classList.toggle('show');
        }
      }
    }
    /**
     * Toggle size selector dropdown on desktop
     */

  }, {
    key: "toggleSizeVariantSelector",
    value: function toggleSizeVariantSelector(e) {
      e.stopPropagation();
      var el = document.querySelector('.variant-selector.size .options-container');
      el.classList.toggle('show');
    }
    /**
     * Handle click event upon changing variant
     */

  }, {
    key: "changeVariant",
    value: function changeVariant(e) {
      var selectedColor = document.querySelector('#pdp-hero .variant-selector.color .selected');
      var selectedSize = document.querySelector('#pdp-hero .variant-selector.size .selected');
      if (selectedColor) selectedColor = selectedColor.dataset.value;
      if (selectedSize) selectedSize = selectedSize.dataset.value;
      var target = e.target;
      var parent = target;

      while (!parent.classList.contains('variant-selector')) {
        parent = parent.parentElement;
      }

      if (parent.classList.contains('color')) {
        selectedColor = target.dataset.value;
      } else if (parent.classList.contains('size')) {
        selectedSize = target.dataset.value;
      }

      var productUrl = '//' + location.host + location.pathname;
      var variants = document.querySelector('#prod-selected-id').options;
      var variantSize = variants.length;

      for (var i = 0; i < variantSize; i++) {
        if (selectedColor && !variants[i].text.includes(selectedColor)) {
          continue;
        }

        if (selectedSize && !variants[i].text.includes(selectedSize)) {
          continue;
        }

        location.href = productUrl + "?variant=".concat(variants[i].value);
        break;
      }
    }
    /**
     * Handle add to cart button using Shopify Ajax API
     */

  }, {
    key: "submitOrder",
    value: function submitOrder(e) {
      var _this2 = this;
      e.preventDefault(); // Open QVC page if specified

      var href = e.target.dataset.href;

      if (href) {
        var newTab = window.open(href, '_blank');
        newTab.focus();
        return;
      }

      var variantId;
      var variants = document.querySelector('#prod-selected-id');
      var variantOptions = variants.options;
      var selectedVariantIndex = variants.selectedIndex;
      var isSubscription = this.input_purchase_type.value === 'autodeliver';
      var properties; // Check if subscription order
var quantity = document.getElementById('quantityyy').value;

      if (isSubscription) {
        variantId = variantOptions[selectedVariantIndex].dataset.value;
        properties = {
          shipping_interval_frequency: this.input_shipping_interval_frequency.value,
          shipping_interval_unit_type: this.input_shipping_interval_unit_type.value
        };
      } else {
        variantId = variantOptions[selectedVariantIndex].value;
      }

      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: quantity,
          id: variantId,
          properties: properties
        })
      }).then(function (res) {
        if (res.ok) return res.json();else throw Error("Request rejected with status ".concat(res.status));
      }).then(function (res) {
        Object(_updateCart__WEBPACK_IMPORTED_MODULE_1__["initializeCart"])();

        //_this2.body.classList.add('cart-open');

        //document.getElementById('shopify-section-cart').classList.add('show');
      }).catch(console.log);
    }
    /**
     * Add all product on routine section using Shopify Ajax API
     */

  }, {
    key: "addAllToCart",
    value: function addAllToCart() {
      var _this3 = this;

      var items = [];
      this.routineProducts.forEach(function (product) {
        var isAvailable = product.querySelector('.price').innerText !== 'Out of stock';

        if (isAvailable) {
          items.push({
            quantity: 1,
            id: parseInt(product.dataset.id)
          });
        }
      });
      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: items
        })
      }).then(function (res) {
        if (res.ok) return res.json();else throw Error("Request rejected with status ".concat(res.status));
      }).then(function (res) {
        Object(_updateCart__WEBPACK_IMPORTED_MODULE_1__["initializeCart"])();

        //_this3.body.classList.add('cart-open');

        //document.getElementById('shopify-section-cart').classList.add('show');
      }).catch(console.log);
    }
    /**
     * Open product routine quickview modal
     */

  }, {
    key: "openRoutineModal",
    value: function openRoutineModal(e) {
      e.preventDefault();
      var target = e.target;

      while (!target.classList.contains('product-item')) {
        target = target.parentElement;
      }

      var productId = target.dataset.productid;
      var routineModal = document.getElementById("quick-view-".concat(productId));
      var selectedImg = routineModal.querySelector('.hero-selected-img');
      selectedImg.src = selectedImg.dataset.src;
      routineModal.style.display = 'flex';
    }
    /**
     * Handle what you get tab switching
     */

  }, {
    key: "switchTab",
    value: function switchTab(e) {
      var target = e.target;
      var index = target.dataset.index;
      var parent = target.parentElement;
      var sibling = parent.nextElementSibling || parent.previousElementSibling;
      this.flktyWYG.select(index);
      sibling.classList.remove('active');
      parent.classList.add('active');
    }
  }]);

  return Pdp;
}();



/***/ }),

/***/ "./src/js/page/plp.js":
/*!****************************!*\
  !*** ./src/js/page/plp.js ***!
  \****************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Plp; });
/* harmony import */ var _components_quickView__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../components/quickView */ "./src/js/components/quickView.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }



var Plp = /*#__PURE__*/function () {
  function Plp() {
    _classCallCheck(this, Plp);

    this._init();
  }

  _createClass(Plp, [{
    key: "_init",
    value: function _init() {
      var _this = this;

      var quickView = new _components_quickView__WEBPACK_IMPORTED_MODULE_0__["default"]('.modal');
    }
  }]);

  return Plp;
}();



/***/ }),

/***/ "./src/js/page/product/reviews-add-product-title.js":
/*!**********************************************************!*\
  !*** ./src/js/page/product/reviews-add-product-title.js ***!
  \**********************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

var config = {
  attributes: true,
  childList: true,
  subtree: true
};
}),

/***/ "./src/js/page/re-charge/address.js":
/*!******************************************!*\
  !*** ./src/js/page/re-charge/address.js ***!
  \******************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = (function () {});

/***/ }),

/***/ "./src/js/page/re-charge/index.js":
/*!****************************************!*\
  !*** ./src/js/page/re-charge/index.js ***!
  \****************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _subscription__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./subscription */ "./src/js/page/re-charge/subscription.js");
/* harmony import */ var _address__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./address */ "./src/js/page/re-charge/address.js");
/* harmony import */ var _payment_source__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./payment-source */ "./src/js/page/re-charge/payment-source.js");
function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _wrapRegExp(re, groups) { _wrapRegExp = function _wrapRegExp(re, groups) { return new BabelRegExp(re, undefined, groups); }; var _RegExp = _wrapNativeSuper(RegExp); var _super = RegExp.prototype; var _groups = new WeakMap(); function BabelRegExp(re, flags, groups) { var _this = _RegExp.call(this, re, flags); _groups.set(_this, groups || _groups.get(re)); return _this; } _inherits(BabelRegExp, _RegExp); BabelRegExp.prototype.exec = function (str) { var result = _super.exec.call(this, str); if (result) result.groups = buildGroups(result, this); return result; }; BabelRegExp.prototype[Symbol.replace] = function (str, substitution) { if (typeof substitution === "string") { var groups = _groups.get(this); return _super[Symbol.replace].call(this, str, substitution.replace(/\$<([^>]+)>/g, function (_, name) { return "$" + groups[name]; })); } else if (typeof substitution === "function") { var _this = this; return _super[Symbol.replace].call(this, str, function () { var args = []; args.push.apply(args, arguments); if (_typeof(args[args.length - 1]) !== "object") { args.push(buildGroups(args, _this)); } return substitution.apply(this, args); }); } else { return _super[Symbol.replace].call(this, str, substitution); } }; function buildGroups(result, re) { var g = _groups.get(re); return Object.keys(g).reduce(function (groups, name) { groups[name] = result[g[name]]; return groups; }, Object.create(null)); } return _wrapRegExp.apply(this, arguments); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }




/* harmony default export */ __webpack_exports__["default"] = (function () {
  var url = new URL(window.location);

  var parsedUrl = /*#__PURE__*/_wrapRegExp(/\/([\0-\.0-\uFFFF]*)\/(payment_source|subscriptions|addresses)(\/([0-9]+)(\/address)?)?$/, {
    userId: 1,
    section: 2,
    id: 4
  }).exec(url.pathname);

  if (!parsedUrl) return; // Couldn't parse

  var _parsedUrl$groups = parsedUrl.groups;
  _parsedUrl$groups = _parsedUrl$groups === void 0 ? {} : _parsedUrl$groups;
  var section = _parsedUrl$groups.section,
      id = _parsedUrl$groups.id;
  var sid = url.searchParams.get('sid') || section === 'subscriptions' && id; // Replace SIDs

  sid && replaceSid(sid);

  switch (section) {
    case 'subscriptions':
      return id && Object(_subscription__WEBPACK_IMPORTED_MODULE_0__["default"])();

    case 'addresses':
      return id && Object(_address__WEBPACK_IMPORTED_MODULE_1__["default"])();

    case 'payment_source':
      return Object(_payment_source__WEBPACK_IMPORTED_MODULE_2__["default"])();

    default:
      return;
  }
});

function replaceSid(sid) {
  // Add sid to edit urls
  document.querySelectorAll('[data-addsid]').forEach(function (elem) {
    var method = elem.getAttribute('data-addsid') || 'q_arg';
    var url;
    var attr = 'href';

    switch (elem.tagName.toLowerCase()) {
      case 'input':
        attr = 'value';
        break;

      case 'a':
        attr = 'href';
        break;
    }

    try {
      url = new URL(elem.getAttribute(attr));
    } catch (e) {
      return;
    }

    switch (method) {
      case 'q_arg':
        url.searchParams.append('sid', sid);
        break;

      case 'append':
        url.pathname += "/".concat(sid);
        break;

      default:
        return;
      // Unknown method
    }

    elem.setAttribute(attr, url.toString());
  });
}

/***/ }),

/***/ "./src/js/page/re-charge/payment-source.js":
/*!*************************************************!*\
  !*** ./src/js/page/re-charge/payment-source.js ***!
  \*************************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = (function () {});

/***/ }),

/***/ "./src/js/page/re-charge/subscription.js":
/*!***********************************************!*\
  !*** ./src/js/page/re-charge/subscription.js ***!
  \***********************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony default export */ __webpack_exports__["default"] = (function () {});

/***/ }),

/***/ "./src/js/page/resetPassword.js":
/*!**************************************!*\
  !*** ./src/js/page/resetPassword.js ***!
  \**************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return ResetPassword; });
/* harmony import */ var utils_form_validator__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! utils/form-validator */ "./src/js/utils/form-validator.js");
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }



var ResetPassword = function ResetPassword() {
  _classCallCheck(this, ResetPassword);

  var form = document.querySelector('main form');

  if (typeof form !== 'undefined') {
    new utils_form_validator__WEBPACK_IMPORTED_MODULE_0__["default"](form, function () {});
  }
};



/***/ }),

/***/ "./src/js/updateCart.js":
/*!******************************!*\
  !*** ./src/js/updateCart.js ***!
  \******************************/
/*! exports provided: initializeCart, updateCartQuantity, parseMoneyToFloat, getCurrencyString */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "initializeCart", function() { return initializeCart; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "updateCartQuantity", function() { return updateCartQuantity; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "parseMoneyToFloat", function() { return parseMoneyToFloat; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "getCurrencyString", function() { return getCurrencyString; });
/* harmony import */ var js_cookie__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! js-cookie */ "./node_modules/js-cookie/src/js.cookie.js");
/* harmony import */ var js_cookie__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(js_cookie__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var form_json__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! form-json */ "./node_modules/form-json/dist/index.js");
/* harmony import */ var form_json__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(form_json__WEBPACK_IMPORTED_MODULE_1__);
function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  $(".product-item").hover(
  function () {
    var _this = $(this);
    setTimeout(function(){      
    _this.find('.order_submit_data').addClass("showBtn");
    },500);
  },
  function () {
    var _this = $(this);
    setTimeout(function(){
    _this.find('.order_submit_data').removeClass("showBtn");
    },500);
  }
);

$(document).on('click','.order_submit_data',function(){
  var id = $(this).data('id');
  var data = {id:id, quantity:1};
  var custom_price = $(this).parents('.product-item').find('p.price').data('customprice');
  var el = $(this);
  var cartcollection = localStorage.getItem("cartItemCollection"); 

  $.get('/cart.js',function(cart){
    var itemCount = cart.item_count;
    if(itemCount > 0){
      var items = cart.items;
      
      if(cartcollection == 'gift_item'){
        $.post('/cart/clear.js',function(cart){

          localStorage.setItem("cartItemCollection", "collection_item");
          if(custom_price == undefined){
            $.ajax({
              type: 'POST', 
              url: '/cart/add.js',
              dataType: 'json',
              data:{
                id:id, 
                quantity:1
              },
              success: function(data){
                initializeCart();
                console.log('added cart')
              },
              error:function(error){
                console.log(error);
              }
            });
          }else{
            $.ajax({
              type: 'POST', 
              url: '/cart/add.js',
              dataType: 'json',
              data:{
                id:id, 
                quantity:1,
                properties: {
                  "custom-price":parseFloat(custom_price) * 100
                }
              },
              success: function(data){
                initializeCart();
                console.log('added cart')
              },
              error:function(error){
                console.log(error);
              }
            });
          }

        });
	  } else {
          localStorage.setItem("cartItemCollection", "collection_item");
          if(custom_price == undefined){
            $.ajax({
              type: 'POST', 
              url: '/cart/add.js',
              dataType: 'json',
              data:{
                id:id, 
                quantity:1
              },
              success: function(data){
                initializeCart();
                console.log('added cart')
              },
              error:function(error){
                console.log(error);
              }
            });
          }else{
            $.ajax({
              type: 'POST', 
              url: '/cart/add.js',
              dataType: 'json',
              data:{
                id:id, 
                quantity:1,
                properties: {
                  "custom-price":parseFloat(custom_price) * 100
                }
              },
              success: function(data){
                initializeCart();
                console.log('added cart')
              },
              error:function(error){
                console.log(error);
              }
            });
          } 
	  } 
    }else{
        localStorage.setItem("cartItemCollection", "collection_item");
        if(custom_price == undefined){
          $.ajax({
            type: 'POST', 
            url: '/cart/add.js',
            dataType: 'json',
            data:{
              id:id, 
              quantity:1
            },
            success: function(data){
              initializeCart();
              console.log('added cart')
            },
            error:function(error){
              console.log(error);
            }
          });
        }else{
          $.ajax({
            type: 'POST', 
            url: '/cart/add.js',
            dataType: 'json',
            data:{
              id:id, 
              quantity:1,
              properties: {
                "custom-price":parseFloat(custom_price) * 100
              }
            },
            success: function(data){
              initializeCart();
              console.log('added cart')
            },
            error:function(error){
              console.log(error);
            }
          });
        }
    }

  },'json')

});
  
  $(".add_to_cart_custom").click(function() {
    var _this = $(this);
    var variant_id = $('#prod-selected-id').val();
    var quantity = $('#quantityyy').val();
    var custom_price = $(".price").data('customprice');
    // $.get('/cart.js',function(cart){
    if(custom_price == undefined){
      $.ajax({
        type: 'POST', 
        url: '/cart/add.js',
        dataType: 'json',
        data:{
          id:variant_id, 
          quantity:quantity
        },
        success: function(data){
          //console.log(data);
          initializeCart();
          _this.addClass('added').text($('#added_to_bag_text').val());

        },
        error:function(error){
          console.log(error);
        }
      });
    }else{
      $.ajax({
        type: 'POST', 
        url: '/cart/add.js',
        dataType: 'json',
        data:{
          id:variant_id, 
          quantity:quantity,
          properties: {
            "custom-price":parseFloat(custom_price) * 100
          }
        },
        success: function(data){
          //console.log(data);
          initializeCart();
                _this.addClass('added').text($('#added_to_bag_text').val());
        },
        error:function(error){
          console.log(error);
        }
      });
    }
    //},'json')

  });

$(document).on('click','.remove_from_cart',function(){
  var id = $(this).data('id');
  var data = {id:id,quantity:0};
  var el = $(this);
  $.post('/cart/change.js',data,function(cart){
    initializeCart();
  },'json')
  /* Start of 11th May Changes by Madhav */
  var addAddbtn = '<button id="order-submit" data-id="'+id+'" class="primary add-to-cart btn-theme-white andri order_submit_data recommended-button-submission" type="button">'+$('#add_to_bag_text').val()+'</button>';
  /* End of 1th May Changes by Madhav */
  $('.remove_from_cart[data-id="'+id+'"]').replaceWith(addAddbtn);
   /* start 22nd April hanages by madhav */
  $('.msg-added-in-bag[data-id="'+id+'"]').removeClass('added');
   /* End 22nd April hanages by madhav */
  $('.msg-added-in-bag[data-id="'+id+'"]').text("");
});  
  
 
function initializeCart() {
  var _this = this;
 
  var cart = document.getElementById('shopify-section-cart');
  fetch('/cart.js', {
    method: 'GET'
  }).then(function (res) {
    return res.json();
  }).then(function (res) {
    // Calculate total price
    var total = res.total_price / 100
    total = total.toFixed(2);
    var subtotal = '€'+total; // Handle gift product

    if (document.getElementById('gift-product')) {
      var $giftProduct = document.getElementById('gift-product');
      var $form = $giftProduct.querySelector('.js-gift-product');

      if (document.querySelector('.js-cart-product-gift')) {
        js_cookie__WEBPACK_IMPORTED_MODULE_0___default.a.set('korres-gift-is-added', true);
      }

      if (js_cookie__WEBPACK_IMPORTED_MODULE_0___default.a.get('korres-gift-is-added') === undefined && res.original_total_price >= window.minPrice && !document.querySelector('.js-cart-product-gift')) {
        if (!window.promoCode) {
          fetch('/cart/add.js', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(form_json__WEBPACK_IMPORTED_MODULE_1___default()($form))
          }).then(function (res) {
            if (res.ok) return res.json();else throw Error("Request rejected with status ".concat(res.status));
          }).then(function (res) {
            js_cookie__WEBPACK_IMPORTED_MODULE_0___default.a.set('korres-gift-is-added', true);
            initializeCart();

           // _this.body.classList.add('cart-open');

            //document.getElementById('shopify-section-cart').classList.add('show');
          }).catch(console.log);
        }
      }

      if (res.original_total_price - window.giftProductPrice < window.minPrice && js_cookie__WEBPACK_IMPORTED_MODULE_0___default.a.get('korres-gift-is-added') === 'true' && document.querySelector('.js-cart-product-gift')) {
        if (!window.promoCode) {
          document.querySelector('.js-cart-product-gift .push button').click();
          js_cookie__WEBPACK_IMPORTED_MODULE_0___default.a.remove('korres-gift-is-added');
        }
      }
    } // Update layout


    var freeSampleLabel = cart.querySelector('header h6');
    var freeSampleContainer = cart.querySelector('.free-sample');
    var freeSampleItems = freeSampleContainer.querySelectorAll('.item');
    var orderSummaryEl = cart.querySelector('footer');
    var itemContainer = cart.querySelector('.cart-container .items');
    var navCartCountEl = document.querySelectorAll('#shopify-section-menu-bar .cart .items-count');
    for (let i = 0; i < navCartCountEl.length; i++) {
      navCartCountEl[i].innerHTML = res.item_count;
    }
    var cartCountEl = cart.querySelector('header h1 span');
    cartCountEl.innerText = res.item_count;
    var subtotalEl = cart.querySelector('footer .subtotal p');
    subtotalEl.innerText = subtotal.replace('.',',');
    
    subtotalEl.dataset.value = res.total_price;
    removeChildren(itemContainer);
    /* start of 11th may changes by madhav */
    $('.add-to-cart:not(.reedim_points)').text($('#add_to_bag_text').val()).removeClass('added');
    /* end of 11th may changes by madhav */
    if (res.items.length === 0) {
      itemContainer.innerHTML = '<p class="empty">Your shopping cart is empty</p>';
      freeSampleLabel.style.display = 'none';
      freeSampleContainer.classList.add('hidden');
      orderSummaryEl.classList.add('hidden');
    } else {
      freeSampleLabel.style.display = 'block';
      freeSampleContainer.classList.remove('hidden');
      orderSummaryEl.classList.remove('hidden');
      
      res.items.forEach(function (item) {
        /* Start of 21st May Changes by Madhav */
        var productName = '';
        var current_lang = document.querySelector("html").getAttribute('lang');
        if(current_lang == 'el' ){
            var pUrl = "https://api.korresfamily.com/api/v1/MarketplaceItem/GetproductdetailsListbyshopify?product="+item.product_id;
            $.ajax({
              type: "GET",
              url: pUrl,
              async:false,
              dataType: 'json'
            }).done(function(data){
                productName = data.results[0].product_name;        	
            });
        }
        /* End of 11th May Changes by Madhav */
       // console.log('price -ciustom '+parseFloat(item.properties['custom-price']))
        var custom_price = 0;
        if(!isNaN(item.properties['custom-price'])){
      		custom_price = (parseFloat(item.properties['custom-price']) / 100).toFixed(2);
        }
        /* Start of 11th May Changes by Madhav */
        $('.add-to-cart[data-id="'+item.id+'"]').text($('#added_to_bag_text').val()).addClass('added');		
        var addRemovebtn = '<button class="btn-theme-white sm primary remove_from_cart" data-id="'+item.id+'" type="button">'+$('#remove_from_cart_text').val()+'</button>';
        $('.recommended-button-submission[data-id="'+item.id+'"]').replaceWith(addRemovebtn);
        $('.msg-added-in-bag[data-id="'+item.id+'"]').text($('#added_to_bag_text').val()).addClass('added');
		/* End of 11th May Changes by Madhav */        

        if(productName == '' ){
         productName = item.product_title.toLowerCase().includes('auto renew') ? item.product_title.slice(0, -11) : item.product_title;
        }
        var img = item.image ? item.image : 'https://cdn.shopify.com/s/files/1/0287/4019/0267/files/Missing-Assets.jpg?v=1586456716';
        var url = item.url;
        var wish_list = '<div class="add-to-wishlist"><div class="show"><div class="default-wishbutton-"'+item.handle+ '"loading"><span class="add-in-wishlist-js btn" href="'+item.handle+'"><i class="far fa-heart"></i><span class="tooltip-label"  style="display: none;">Add to wishlist</span></span></div><div class="loadding-wishbutton-"'+item.handle+'" loading btn" style="display: none; pointer-events: none"><span class="add_to_wishlist" href="'+item.handle+'"><i class="fas fa-spinner"></i></span></div><div class="added-wishbutton-"'+item.handle+'" loading" style="display: none;"><span class="added-wishlist add_to_wishlist btn" href="/pages/wishlist"><i class="fas fa-heart"></i><span class="tooltip-label" style="display: none;">View Wishlist</span></span></div></div></div>';
        var subFrequency;
        var subUnit;
        var isFreeSample;
        var isGiftProduct = false;

        if (item.properties) {
          subFrequency = item.properties.shipping_interval_frequency;
          subUnit = item.properties.shipping_interval_unit_type;
          isFreeSample = item.properties.free_sample;
        }

        if (item.id === window.variantID) {
          isGiftProduct = true;
        }

        if (isGiftProduct && window.giftProduct['link'] !== '') {
          url = window.giftProduct['link'];
        } // Disable add sample button if one already added


        if (isFreeSample) {
          freeSampleContainer.classList.add('hidden');
        } // Add product description


        var subtitle = '';

        if (subFrequency) {
          subtitle += "<p class='cart_pl'>Quantity: ".concat(item.quantity, " - ").concat(getCurrencyString(item.price, res.currency), "</p>");
        }

        item.options_with_values.forEach(function (option, index) {
          if (option.name === 'Ingredient' || option.name === 'Color') {
            subtitle += "<p>Color: ".concat(item.variant_options[index], "</p>");
          } else if (option.name !== 'Title') {
            subtitle += "<p>".concat(option.name, ": ").concat(item.variant_options[index], "</p>");
          }
        });

        if (subFrequency) {
          subtitle += "<p>Next shipment: ".concat(getNextSubscription(parseInt(subFrequency)), " - Every ").concat(subFrequency, " ").concat(subUnit.toLowerCase(), "</p>");
        } else if (!isFreeSample) {
          subtitle += "\n                <div class=\"adjust-quantity\">\n                  <button class=\"minus\">\n                    <svg width=\"12\" height=\"2\" viewBox=\"0 0 12 2\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                      <path stroke=\"#444\" stroke-width=\"2\" d=\"M12 1H0\"/>\n                    </svg>\n                  </button>\n                  <p>".concat(item.quantity < 10 ? '' : '').concat(item.quantity, "</p>\n                  <button class=\"plus\">\n                    <svg width=\"12\" height=\"12\" viewBox=\"0 0 12 12\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n                      <path stroke=\"#444\" stroke-width=\"2\" d=\"M6 0v12M12 6H0\"/>\n                    </svg>\n                  </button>\n                </div>\n              ");
        } // Create element


        var el = document.createElement('div');
		el.classList.add('cart-item');
      
        if (isGiftProduct) {
          el.classList.add('js-cart-product-gift');
          el.classList.add('line-item--gift');
        }

        if (window.giftProduct['link'] !== '') {
          el.classList.add('line-item--gift-link');
        }
         var testb= item.id;
         // code by vishvaraj
        el.innerHTML = "\n              <div class='items_main'>\n                <a href=\"".concat(url, "\">\n                  <img src=\"").concat(img, "\" alt=\"").concat(productName, "\">\n                </a>\n              </div>\n\n              <div class=\"details \">\n                <h2 data-custompr='"+custom_price+"'>\n                  <a href=\"").concat(url, "\">\n                    ").concat(productName, "\n                  </a>\n                </h2>\n                ").concat(subtitle, "\n\n                ").concat(isGiftProduct && window.giftMessage !== undefined ? '<p class="cart-gift-message">' + window.giftMessage + '</p>' : '', "\n              </div>\n\n              <div class=\"push\">"+wish_list+"\n                <button onclick=\"removeCart('"+url+"')\" data-handle="+url+" class=\"removecart\" id="+testb+">- Remove</button>\n\n      <span  style='visibility: visible;text-align: center;'>          <p class='cart-mini-price>")
         // code by vishvaraj
        .concat(item.price > 0 ? getCurrencyString(item.price, res.currency) +"€" : 'Free', "</p> </span>\n              </div>\n            "); // Attach event listeners
        // Remove item from cart

        el.querySelector('.push button').addEventListener('click', function () {
           
          var User_Id = document.getElementById('custid').innerHTML;
          var countEl = el.querySelector('.adjust-quantity p');
          var count = 1;
          if (countEl) count = parseInt(countEl.innerText);
          var linePrice = parseMoneyToFloat(item.price.toString()) * count;
          var currentValue = parseMoneyToFloat(subtotalEl.dataset.value);
          var newValue = currentValue - linePrice;
          var newValueStr = "".concat(newValue).concat(newValue % 1 === 0 ? '00' : '');
          el.remove();
          navCartCountEl.innerHTML = "".concat(parseInt(cartCountEl.innerText) - count);
          cartCountEl.innerText = "".concat(parseInt(cartCountEl.innerText) - count);

          if (parseInt(cartCountEl.innerHTML) < 1) {
            itemContainer.innerHTML = '<p class="empty">Your shopping cart is empty</p>';
            freeSampleContainer.classList.add('hidden');
            orderSummaryEl.classList.add('hidden');
          }

          if (isFreeSample) {
            freeSampleContainer.classList.remove('hidden');
          }

          updateCartQuantity(item.id, 0);
        });
        var minusBtn = el.querySelector('button.minus');
        var plusBtn = el.querySelector('button.plus');

        if (minusBtn && plusBtn) {
          var countEl = el.querySelector('.adjust-quantity p'); // Reduce quantity

          minusBtn.addEventListener('click', function () {
           
            var testb= item.id;
           
 			var User_Id = document.getElementById('custid').innerHTML;

            
            var count = parseInt(countEl.innerText) - 1;
            var currentValue = parseMoneyToFloat(subtotalEl.dataset.value);
            var newValue = (currentValue - parseMoneyToFloat(item.price.toString())).toFixed(2);
            var newValueStr = newValue.toString().match(/\d/g).join('');

            if (count < 1) {
              el.remove();
            } else {
              countEl.innerText = "".concat(count < 10 ? '' : '').concat(count);
            }

            navCartCountEl.innerHTML = "".concat(parseInt(cartCountEl.innerText) - 1);
            cartCountEl.innerText = "".concat(parseInt(cartCountEl.innerText) - 1);
//             var total = newValueStr / 100
//             total = total.toFixed(2);
//             var subtotal = '€'+total;
//             subtotalEl.innerText = subtotal.replace('.',',');
//             subtotalEl.dataset.value = newValueStr;

            if (parseInt(cartCountEl.innerHTML) < 1) {
              itemContainer.innerHTML = '<p class="empty">Your shopping cart is empty</p>';
              freeSampleContainer.classList.add('hidden');
              orderSummaryEl.classList.add('hidden');
            }
            updateCartQuantity(item.id, count);
            $(this).attr('disabled',true);
            setTimeout(function(e){
              $(this).removeAttr('disabled');
            },500)
          }); // Add quantity

          plusBtn.addEventListener('click', function () {
            console.log('plus click')
          
              var testb= item.id;
              
 			var User_Id = document.getElementById('custid').innerHTML;
       
        
            var count = parseInt(countEl.innerText) + 1;
            var currentValue = parseMoneyToFloat(subtotalEl.dataset.value);
            var newValue = (currentValue + parseMoneyToFloat(item.price.toString())).toFixed(2);
            console.log(newValue);
            var newValueStr = newValue.toString().match(/\d/g).join('');
            navCartCountEl.innerHTML = "".concat(parseInt(cartCountEl.innerText) + 1);
            cartCountEl.innerText = "".concat(parseInt(cartCountEl.innerText) + 1);
            countEl.innerText = "".concat(count < 10 ? '' : '').concat(count);
            updateCartQuantity(item.id, count);
            $(this).attr('disabled',true);
            setTimeout(function(e){
              $(this).removeAttr('disabled');
            },500)
          });
        } // Render element


        itemContainer.appendChild(el);
      });

      if (window.miniUpsell !== undefined) {
        var miniUpsellHtml = document.createElement('div');
        miniUpsellHtml.innerHTML = "\n                <div class=\"details upsell\">\n                  <h2 style=\"color: ".concat(window.miniUpsell.color, "; font-family: ").concat(window.miniUpsell.font, ";\">").concat(window.miniUpsell.text, "</h2>\n                </div>\n              ");
        itemContainer.prepend(miniUpsellHtml);
      }
    }
    // code by vishvaraj
    var temp_total = 0;
    setTimeout(function(e){
      $('.cart-drawer-container .cart-container .cart-item').each(function(e){
        var c_price = parseFloat($(this).find('.details h2').data('custompr'));
        var qty = parseInt($(this).find('.details .adjust-quantity p').text());
        var m_total = c_price * qty;
        temp_total += m_total;
        $('.subtotal .submain').html('€'+temp_total.toFixed(2))
      })
    },500);
    //end code by vishvaraj
  });
} // -------------- Helper Methods -------------- //

function updateCartQuantity(id, quantity) {
  fetch('/cart/update.js', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      updates: _defineProperty({}, id, quantity)
    })
  }).then(function (res) {
    if (res.ok) return res.json();else throw Error("Request rejected with status ".concat(res.status));
  }).then(function (res) {
    initializeCart();
  });
}
function parseMoneyToFloat(money) {
  return parseFloat(money.slice(0, -2) + ',' + money.slice(-2));
}
function getCurrencyString(price, currency) {
  var total_price = price.toString();
  total_price = parseMoneyToFloat(total_price);
  return total_price.toLocaleString(undefined, {
    style: 'currency',
    currency: currency
  });
}

function removeChildren(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function getNextSubscription(days) {
  var result = new Date();
  result.setDate(result.getDate() + days);
  return result.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/***/ }),

/***/ "./src/js/utils/form-validator.js":
/*!****************************************!*\
  !*** ./src/js/utils/form-validator.js ***!
  \****************************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

// Origin: https://github.com/Via-profit/js-form-validator/blob/master/js-form-validator.js
var FormValidator = /*#__PURE__*/function () {
  function FormValidator(formHandle) {
    var settings = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var submitCallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : function (err, res) {
      return !err;
    };

    _classCallCheck(this, FormValidator);

    _defineProperty(this, "messages", {
      // English
      en: {
        required: {
          empty: 'This field is required.',
          incorrect: 'Incorrect value.'
        },
        notzero: {
          empty: 'Please make a selection.',
          incorrect: 'Incorrect value.'
        },
        integer: {
          empty: 'Enter an integer value.',
          incorrect: 'Incorrect integer value.'
        },
        float: {
          empty: 'Enter an float number.',
          incorrect: 'Incorrect float.'
        },
        min: {
          empty: 'Enter more.',
          incorrect: 'Enter more.'
        },
        max: {
          empty: 'Enter less.',
          incorrect: 'Enter less.'
        },
        between: {
          empty: 'Enter the between {0}-{1}.',
          incorrect: 'Enter the between {0}-{1}.'
        },
        name: {
          empty: 'Please enter your full name.',
          incorrect: 'Incorrect name.'
        },
        firstname: {
          empty: 'Please enter your first name.',
          incorrect: 'Incorrect first name.'
        },
        lastname: {
          empty: 'Please enter your last name.',
          incorrect: 'Incorrect last name.'
        },
        phone: {
          empty: 'Please enter the phone number.',
          incorrect: 'Incorrect phone number.'
        },
        email: {
          empty: 'Please enter your email address.',
          incorrect: 'Please enter a valid email address.'
        },
        length: {
          empty: 'Please Enter a minimum of {0} characters and a maximum of {1}.',
          incorrect: 'Incorrect. Enter a minimum of {0} characters and a maximum of {1}.'
        },
        minlength: {
          empty: 'Please enter at least {0} characters.',
          incorrect: 'You have entered less than {0} characters.'
        },
        maxlength: {
          empty: 'Please enter at maximum {0} characters.',
          incorrect: 'You have entered more than {0} characters.'
        },
        maxfilesize: {
          empty: 'The size of one or more selected files larger than {0} {1}.',
          incorrect: 'The size of one or more selected files larger than {0} {1}.'
        },
        fileextension: {
          empty: 'Select file.',
          incorrect: 'One or more files have an invalid type.'
        }
      }
    });

    _defineProperty(this, "rules", {
      required: function required(value) {
        return '' !== value;
      },
      notzero: function notzero(value) {
        return parseInt(value, 10) > 0;
      },
      integer: function integer(value) {
        return new RegExp(/^[0-9]+$/gi).test(value);
      },
      float: function float(value) {
        value = value.toString().replace(/\,/, '.');
        return this.integer(value) || new RegExp(/^([0-9])+(\.)([0-9]+$)/gi).test(value);
      },
      min: function min(value, params) {
        if (this.float(value)) {
          return parseFloat(value) >= parseFloat(params[0]);
        }

        return parseInt(value, 10) >= parseInt(params[0], 10);
      },
      max: function max(value, params) {
        if (this.float(value)) {
          return parseFloat(value) <= parseFloat(params[0]);
        }

        return parseInt(value, 10) <= parseInt(params[0], 10);
      },
      between: function between(value, params) {
        params[1] = params[1] || 999999;

        if (this.float(value)) {
          return parseFloat(value) >= parseFloat(params[0]) && parseFloat(value) <= parseFloat(params[1]);
        }

        if (this.integer(value)) {
          return parseInt(value, 10) >= parseInt(params[0], 10) && parseInt(value, 10) <= parseInt(params[1], 10);
        }

        return false;
      },
      name: function name(value) {
        if (value.length > 0 && value.length < 2) {
          return false;
        }

        return new RegExp(/^[a-zA-Z\sа-яА-ЯёЁ\-]+$/g).test(value);
      },
      lastname: function lastname(value) {
        return this.name(value);
      },
      phone: function phone(value) {
        if (value.replace(/[^0-9]+/gi, '').match(/[0-9]+/gi) && value.replace(/[^0-9]+/gi, '').match(/[0-9]+/gi)[0].length < 6) {
          return false;
        }

        return new RegExp(/^(?:(?:\(?(?:00|\+)([1-4]\d\d|[1-9]\d?)\)?)?[\-\.\ \\\/]?)?((?:\(?\d{1,}\)?[\-\.\ \\\/]?){0,})(?:[\-\.\ \\\/]?(?:#|ext\.?|extension|x)[\-\.\ \\\/]?(\d+))?$/g).test(value);
      },
      email: function email(value) {
        return new RegExp(/^(("[\w-\s]+")|([\w\-]+(?:\.[\w\-]+)*)|("[\w-\s]+")([\w\-]+(?:\.[\w\-]+)*))(@((?:[\w\-]+\.)*\w[\w\-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i).test(value);
      },
      length: function length(value, params) {
        return this.between(value.replace(/\s{2,}/g, ' ').length, params);
      },
      maxlength: function maxlength(value, params) {
        return this.max(value.replace(/\s{2,}/g, ' ').length, params);
      },
      minlength: function minlength(value, params) {
        return this.min(value.replace(/\s{2,}/g, ' ').length, params);
      },
      maxfilesize: function maxfilesize(value, params) {
        var i,
            l = value.length,
            unitsOffset = 1;

        switch (params[1].toLowerCase()) {
          case 'b':
            unitsOffset = 1;
            break;

          case 'kb':
            unitsOffset = 1024;
            break;

          case 'mb':
            unitsOffset = 1048576;
            break;

          case 'gb':
            unitsOffset = 1073741824;
            break;

          case 'tb':
            unitsOffset = 1099511627776;
            break;
        }

        for (i = 0; i < l; i += 1) {
          if (parseFloat(value[i]) > parseFloat(params[0]) * unitsOffset) {
            return false;
          }
        }

        return true;
      },
      fileextension: function fileextension(value, params) {
        var i,
            a,
            l = params.length,
            b = value.length,
            cmpResC = 0;

        for (i = 0; i < l; i += 1) {
          for (a = 0; a < b; a += 1) {
            if (params[i] === value[a].split('.').pop()) {
              cmpResC += 1;
            }
          }
        }

        return value.length === cmpResC ? true : false;
      }
    });

    formHandle.JsValidator = this;
    this.settings = {
      // Validation of a current field after the events of "change", "keyup", "blur"
      onAir: true,
      // Show validation errors
      showErrors: true,
      // Auto-hide the error messages
      autoHideErrors: false,
      // Timeout auto-hide error messages
      autoHideErrorsTimeout: 2000,
      // Language error messages
      locale: 'en',
      // Object for custom error messages
      messages: {},
      // Object for custom rules
      rules: {},
      // classname for error messages
      errorClassName: 'error',
      // remove spaces from validation field values
      removeSpaces: false,
      // tracking of new elements
      autoTracking: true,
      // events list for binding
      eventsList: ['keyup', 'change', 'blur']
    };
    var self = this; // set handle

    this.formHandle = formHandle || null; // set callback

    this.submitCallback = submitCallback || null; // get fields and rules

    this.fields = this.getFields(this.formHandle.querySelectorAll('[data-rule]')); // apply custom settings

    this.applySettings(settings || {});
    this.submitCallback = this.submitCallback.bind(this);
    this._eventChangeWithDelay = this._eventChangeWithDelay.bind(this);
    this._eventChange = this._eventChange.bind(this);
    this._eventSubmit = this._eventSubmit.bind(this); // bind events

    this.submitCallback && this.eventsBuilder('addEventListener'); // autotracking for new form elements

    this.settings.autoTracking && 'MutationObserver' in window && new MutationObserver(function (mutationRecords) {
      [].forEach.call(mutationRecords, function (mutation) {
        switch (mutation.type) {
          case 'subtree':
          case 'childList':
            var reloadFlag = false,
                childsArray = [];
            [].forEach.call(mutation.addedNodes, function (targetElem) {
              childsArray = targetElem.querySelectorAll ? targetElem.querySelectorAll('*') : [];

              if (['SELECT', 'INPUT', 'TEXTAREA', 'CHECKBOX', 'RADIOBUTTON'].indexOf(targetElem.tagName) !== -1) {
                reloadFlag = true;
              }

              !reloadFlag && [].forEach.call(childsArray, function (elem) {
                if (['SELECT', 'INPUT', 'TEXTAREA', 'CHECKBOX', 'RADIOBUTTON'].indexOf(elem.tagName) !== -1) {
                  reloadFlag = true;
                }
              });
            });
            reloadFlag && self.reload();
            break;
        }
      });
    }).observe(this.formHandle, {
      childList: true,
      subtree: true
    });
  }

  _createClass(FormValidator, [{
    key: "orderFields",
    value: function orderFields(attrName, attrValue) {
      var self = this,
          retObj = {};
      !!attrName && !!attrValue && Object.keys(this.fields).forEach(function (field) {
        if (self.fields[field].handle[attrName] && self.fields[field].handle[attrName] === attrValue) {
          retObj[field] = self.fields[field];
        }
      });
      return retObj;
    }
  }, {
    key: "_eventSubmit",
    value: function _eventSubmit(e) {
      e.preventDefault(); //hide errors

      this.hideErrors(false, true); //show errors if validation failure

      !this.validate() && this.showErrors(); //callback

      this.submitCallback(this.errors || null, this.errors ? false : true) === true && this.formHandle.submit();
    }
  }, {
    key: "_eventChange",
    value: function _eventChange(e) {
      var radioBtns,
          self = this; //remove spaces

      if (this.settings.removeSpaces && new RegExp(/\s{2,}/g).test(e.target.value)) {
        e.target.value = e.target.value.replace(/\s{2,}/g, ' ');
      } //if is radio buttons


      if (e.target.type === 'radio') {
        //get radio groupe
        radioBtns = this.orderFields('name', e.target.name);
        Object.keys(radioBtns).forEach(function (btn) {
          self.hideErrors(radioBtns[btn].handle);
        });
      } else {
        //hide errors for this
        this.hideErrors(e.target);
      } //validate and show errors for this


      if (!this.validate(e.target)) {
        this.showErrors(e.target);
        !this.settings.showErrors && this.submitCallback(this.errors, false);
      }
    }
  }, {
    key: "_eventChangeWithDelay",
    value: function _eventChangeWithDelay(e) {
      var self = this;

      if (this.intervalID) {
        clearTimeout(this.intervalID);
      }

      this.intervalID = setTimeout(function () {
        self._eventChange.apply(self, [e]);
      }, 400);
    }
  }, {
    key: "applySettings",
    value: function applySettings(settings) {
      var self = this; // apply rules

      settings.rules && Object.keys(settings.rules).forEach(function (ruleName) {
        self.rules[ruleName] = settings.rules[ruleName];
      }); // apply messages

      settings.messages && Object.keys(settings.messages).forEach(function (locale) {
        Object.keys(settings.messages[locale]).forEach(function (ruleName) {
          Object.keys(settings.messages[locale][ruleName]).forEach(function (param) {
            self.settings.messages[locale] = self.settings.messages[locale] || {};
            self.settings.messages[locale][ruleName] = self.settings.messages[locale][ruleName] || {};
            self.settings.messages[locale][ruleName][param] = settings.messages[locale][ruleName][param];
          });
        });
      }); // apply other settings

      Object.keys(settings).forEach(function (param) {
        self.settings[param] = settings[param];
      });
      return this;
    }
  }, {
    key: "getFields",
    value: function getFields(fields) {
      var retData = {},
          rules = [],
          params = [];
      fields = fields || this.formHandle.querySelectorAll('[data-rule]'); // each fields with data-rule attribute

      Object.keys(fields).forEach(function (fieldIndex) {
        rules = fields[fieldIndex].getAttribute('data-rule').split('|');
        Object.keys(rules).forEach(function (ruleIndex) {
          // parse rule
          if (rules[ruleIndex].match(/-/gi)) {
            params = rules[ruleIndex].split('-');
            rules[ruleIndex] = params[0];
            params = params.splice(1);
            rules[ruleIndex] = [rules[ruleIndex], params];
          } else {
            rules[ruleIndex] = [rules[ruleIndex], []];
          }
        });
        retData[fieldIndex] = {
          name: fields[fieldIndex].getAttribute('name'),
          rules: rules,
          defaultValue: fields[fieldIndex].getAttribute('data-default'),
          handle: fields[fieldIndex],
          intervalID: null
        };
      });
      return retData;
    }
  }, {
    key: "validate",
    value: function validate(validationField) {
      var self = this,
          fields = validationField ? this.getFields([validationField]) : this.fields,
          result,
          ruleName,
          params,
          defaultValue,
          value,
          message,
          messageType = null;
      this.errors = this.errors ? null : this.errors;
      Object.keys(fields).forEach(function (n) {
        result = true; // loop rules of this field

        fields[n].rules && Object.keys(fields[n].rules).forEach(function (ruleIndex) {
          // set rule data
          ruleName = fields[n].rules[ruleIndex][0];
          params = fields[n].rules[ruleIndex][1];
          defaultValue = fields[n].defaultValue;
          value = fields[n].handle.value;

          switch (fields[n].handle.type) {
            case 'checkbox':
              !fields[n].handle.checked && (value = '');
              break;

            case 'radio':
              // get radio groupe
              var radioBtns = self.orderFields('name', fields[n].handle.name),
                  checked = false;
              Object.keys(radioBtns).forEach(function (i) {
                radioBtns[i].handle.checked && (checked = true);
              });

              if (!checked) {
                // add an error to one element
                Object.keys(radioBtns).forEach(function (i) {
                  try {
                    message = self.settings.messages[self.settings.locale][ruleName].empty;
                  } catch (e) {
                    message = self.messages[self.settings.locale][ruleName].empty;
                  }
                }); // set value as for empty rules

                value = '';
              }

              break;

            case 'file':
              // if the files were selected
              if (fields[n].handle.files && fields[n].handle.files.length) {
                value = [];
                Object.keys(fields[n].handle.files).forEach(function (fileIndex) {
                  switch (ruleName) {
                    case 'maxfilesize':
                      value.push(fields[n].handle.files[fileIndex].size);
                      break;

                    case 'fileextension':
                      value.push(fields[n].handle.files[fileIndex].name);
                      break;
                  }
                });
              }

              break;
          }

          if (result && !(value === '' && !fields[n].rules.join('|').match(/\|{0,1}required\|{0,1}/))) {
            // if exist default value and value is eq default
            if (result && defaultValue && value !== defaultValue) {
              result = false;
              messageType = 'incorrect'; // if default value not exist
            } else if (result && self.rules[ruleName] && !self.rules[ruleName](value, params)) {
              // set message to empty data
              if ('' === value) {
                result = false;
                messageType = 'empty'; // set message to incorrect data
              } else {
                result = false;
                messageType = 'incorrect';
              }
            }

            if (result) {
              self.hideErrors(fields[n].handle, true);
            } else {
              // define errors stack if not exist
              self.errors = self.errors || {}; // append error messages

              if (ruleName === 'required' && fields[n].rules[1] && fields[n].rules[1][0]) {
                ruleName = fields[n].rules[1][0];
                messageType = 'empty';
              }

              try {
                try {
                  message = self.settings.messages[self.settings.locale][ruleName][messageType];
                } catch (e) {
                  message = self.messages[self.settings.locale][ruleName][messageType];
                }
              } catch (e) {
                ruleName = 'required';
                message = self.messages[self.settings.locale][ruleName][messageType];
              } // push value into params if params is empty


              !params.length && params.push(value); // add errors

              self.errors[n] = {
                name: fields[n].name,
                errorText: self.formatString(message, params)
              }; // call callback if exist

              if (!self.submitCallback) {
                self.errors[n].handle = fields[n].handle;
              }
            }
          }
        });
      }); // run callback if callback is exists and not errors or return error data object

      if (this.submitCallback) {
        return this.errors ? false : true;
      }

      return this.errors || true;
    }
  }, {
    key: "hideErrors",
    value: function hideErrors(validationField, removeClass) {
      var self = this,
          errorDiv;
      Object.keys(this.fields).forEach(function (n) {
        if (validationField && validationField === self.fields[n].handle || !validationField) {
          errorDiv = self.fields[n].handle.nextElementSibling; // remove class error

          removeClass && self.fields[n].handle.classList.remove(self.settings.errorClassName); // remove error element

          errorDiv && errorDiv.getAttribute('data-type') === 'validator-error' && errorDiv.parentNode.removeChild(errorDiv);
        }
      });
    }
  }, {
    key: "showErrors",
    value: function showErrors(validationField) {
      var self = this,
          errorDiv,
          insertNodeError = function insertNodeError(refNode, errorObj) {
        // set error class
        refNode.classList.add(self.settings.errorClassName); // check to error div element exist

        if (refNode.nextElementSibling && refNode.nextElementSibling.getAttribute('data-type') === 'validator-error') {
          return;
        } // insert error element


        if (self.settings.showErrors) {
          errorDiv = document.createElement('div');
          errorDiv.setAttribute('class', self.settings.errorClassName);
          errorDiv.setAttribute('data-type', 'validator-error');
          errorDiv.innerHTML = errorObj.errorText;
          refNode.parentNode.insertBefore(errorDiv, refNode.nextSibling);
        }
      };

      Object.keys(this.errors).forEach(function (r) {
        // show error to specified field
        if (validationField) {
          Object.keys(self.fields).forEach(function (n) {
            self.fields[n].handle.getAttribute('name') === validationField.getAttribute('name') && insertNodeError(self.fields[n].handle, self.errors[r]);
          }); // show error to all fields
        } else {
          if (r === '0' || r > 0 && self.fields[r].name !== self.fields[r - 1].name) {
            insertNodeError(self.fields[r].handle, self.errors[r]);
          }
        }
      }); // auto hide errors

      if (this.settings.autoHideErrors) {
        // for all fields
        if (!validationField) {
          if (this.intervalID) {
            clearTimeout(this.intervalID);
          }

          this.intervalID = setTimeout(function () {
            self.intervalID = null;
            self.hideErrors(false);
          }, this.settings.autoHideErrorsTimeout); // for current field
        } else {
          if (validationField.intervalID) {
            clearTimeout(validationField.intervalID);
          }

          if (!this.intervalID) {
            validationField.intervalID = setTimeout(function () {
              validationField.intervalID = null;
              self.hideErrors(validationField);
            }, this.settings.autoHideErrorsTimeout);
          }
        }
      }
    }
    /*
    * Get Form handle
    * @return {element} - Form handle
    */

  }, {
    key: "getFormHandle",
    value: function getFormHandle() {
      return this.formHandle;
    }
    /*
    * Formatting string. Replace string
    * @param {string} string - Source string. Example: "{0} age {1} years."
    * @param {array} params - An array of values​​, which will be replaced with markers. Example: ['Bob', 36]
    * @return {string} - Formatted string with replacing markers. Example "Bob age 36 years"
    */

  }, {
    key: "formatString",
    value: function formatString(string, params) {
      return string.replace(/\{(\d+)\}/gi, function (match, number) {
        return match && params[number] ? params[number] : '';
      });
    }
    /*
    * Destroy validator
    */

  }, {
    key: "destroy",
    value: function destroy() {
      //hide errors
      this.hideErrors(false, true); // remove events

      this.eventsBuilder('removeEventListener');
    }
    /*
    * Reload validator.
    * Example 1: reload(function (err, res) {...}, {autoHideErrors: false})
    * Example 2: reload({autoHideErrors: false})
    * @param {function} [submitCallback] - Submit callback function
    * @param {object} [settings] - Settings object
    */

  }, {
    key: "reload",
    value: function reload(submitCallback, settings) {
      this.destroy(); //set variables

      switch (arguments.length) {
        case 2:
          this.submitCallback = submitCallback;
          this.settings = settings;
          break;

        case 1:
          this.settings = submitCallback;
          break;
      }

      this.fields = this.getFields(this.formHandle.querySelectorAll('[data-rule]'));
      this.submitCallback && this.eventsBuilder('addEventListener');
      this.applySettings(settings || {});
    }
  }, {
    key: "eventsBuilder",
    value: function eventsBuilder(actionName) {
      var self = this;
      this.formHandle[actionName]('submit', this._eventSubmit); // air mode

      this.settings.onAir && Object.keys(this.fields).forEach(function (field) {
        [].forEach.call(self.settings.eventsList, function (event) {
          if (event === 'keyup') {
            self.fields[field].handle[actionName](event, self._eventChangeWithDelay);
          } else {
            self.fields[field].handle[actionName](event, self._eventChange);
          }
        });
      });
    }
  }]);

  return FormValidator;
}();

/* harmony default export */ __webpack_exports__["default"] = (FormValidator);

/***/ }),

/***/ "./src/js/utils/lineClamp.js":
/*!***********************************!*\
  !*** ./src/js/utils/lineClamp.js ***!
  \***********************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return LineClamp; });
/* harmony import */ var lodash_throttle__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! lodash.throttle */ "./node_modules/lodash.throttle/index.js");
/* harmony import */ var lodash_throttle__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(lodash_throttle__WEBPACK_IMPORTED_MODULE_0__);
function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }



var LineClamp = /*#__PURE__*/function () {
  function LineClamp(els) {
    var _this = this;

    _classCallCheck(this, LineClamp);

    var $els = [].slice.call(document.querySelectorAll(els), 0);
    if ($els.length < 1) return;
    this.LINE_HEIGHT = 26;
    this.MAX_LINES = 3;
    this.MORE_TEXT = '&hellip; <span>Read more</span>';
    this.LESS_TEXT = '<span>Read less</span>';
    this.CLASSNAME = 'line-clamp-overflow';
    this.CLASSNAME_SHOW = 'line-clamp-overflow-show';
    this.readmore = null;
    $els.forEach(function (el) {
      _this._init(el);
    });
    window.addEventListener('resize', lodash_throttle__WEBPACK_IMPORTED_MODULE_0___default()(function () {
      $els.forEach(function (el) {
        _this._init(el);
      });
    }, 400));
  }

  _createClass(LineClamp, [{
    key: "_init",
    value: function _init(el) {
      this._destroy(el);

      if (el.clientHeight <= this.LINE_HEIGHT * this.MAX_LINES) return;
      el.classList.add(this.CLASSNAME);
      this.readmore = document.createElement('span');
      this.readmore.className = 'read-more';
      this.readmore.innerHTML = this.MORE_TEXT;
      el.appendChild(this.readmore);
      this.readmore.addEventListener('click', this._expand.bind(this, event, el));
    }
  }, {
    key: "_expand",
    value: function _expand(e, el) {
      el.classList.toggle(this.CLASSNAME_SHOW);

      if (el.classList.contains(this.CLASSNAME_SHOW)) {
        this.readmore.innerHTML = this.LESS_TEXT;
      } else {
        this.readmore.innerHTML = this.MORE_TEXT;
      }
    }
  }, {
    key: "_destroy",
    value: function _destroy(el) {
      el.classList.remove(this.CLASSNAME, this.CLASSNAME_SHOW);
      var btn = el.querySelector('.read-more');

      if (btn !== null) {
        btn.removeEventListener('click', this._expand);
        btn.remove();
      }
    }
  }]);

  return LineClamp;
}();


;

/***/ }),

/***/ "./src/js/utils/mediaQuery.js":
/*!************************************!*\
  !*** ./src/js/utils/mediaQuery.js ***!
  \************************************/
/*! exports provided: isDown */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "isDown", function() { return isDown; });
/* harmony import */ var _constants_breakpoints__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../constants/breakpoints */ "./src/js/constants/breakpoints.js");

function isDown(size) {
  return window.matchMedia("(max-width: ".concat(_constants_breakpoints__WEBPACK_IMPORTED_MODULE_0__["default"][size] - 0.02, "px)")).matches;
}

/***/ })

/******/ });

  $('.qtybox .btnqty').on('click', function(){
  var qty = parseInt($(this).parent('.qtybox').find('.quantity-input').val());
  if($(this).hasClass('qtyplus')) {
    qty++;
  }else {
    if(qty > 1) {
      qty--;
    }
  }
  qty = (isNaN(qty))?1:qty;
  $(this).parent('.qtybox').find('.quantity-input').val(qty);
  }); 


//user icon pop up loged in user
$('.js-call-user-icon-popup').click(function () {
  $('.user-icon-popup').toggleClass("active");
    $('.user-icon-popup').slideToggle("fast");
    $('.img').toggleClass("active");
});

//login pop up
$('.js-call-popup-login').on('click', function () {
    $('.js-poup-login-destop').addClass('active');
    $('.js-bg-login-popup').addClass('active');
    $('.img').addClass('active');
});

//close login pop up
$('.js-btn-close-login').on('click', function () {
    $('.js-poup-login-destop').removeClass('active');
    $('.js-bg-login-popup').removeClass('active');
    $('.img').removeClass("active");
});


$(document).mouseup(function (e) {
    var userIconPopup = $(".user-icon-popup");
    // if the target of the click isn't the container nor a descendant of the container
    if (!userIconPopup.is(e.target) && userIconPopup.has(e.target).length === 0) {
        userIconPopup.hide();
      userIconPopup.removeClass('active');
        $('.img').removeClass("active");
    }
});

//Mobile menu Account 
//Account pop up loged in user
$('.my-account-menu').click(function () {
    $('.user-icon-popup-mobile').slideToggle("fast");
    $('.hamburger').toggleClass("active");
})


$(document).on('click','.js-AddToCart',function(){
  $.each($('.wish_page'),function(i,v){
    var id = $(this).val();
    $.ajax({
      type: 'POST', 
      url: '/cart/add.js',
      dataType: 'json', 
      async:false,
      data:{quantity: 1,id: id},
      success: function(){
        location.href="/cart";
      }
    }); 
  })
})


$(document).on('click','.reedim_points',function(){
  var reedemid = $(this).data('productid');
  var circle = $(this).attr('data-circle');
  var point = $(this).attr('data-giftpoint');
  var cartcollection = localStorage.getItem("cartItemCollection"); 
  var lang = '';
  var current_lang = document.querySelector("html").getAttribute('lang');
  if(current_lang == 'el'){
    lang = "/el";
  }else{
    lang = "";
  }
  $.get('/cart.js',function(cart){
    var itemCount = cart.item_count;
    if(itemCount > 0){
      var items = cart.items;
      
      if(cartcollection == 'collection_item'){
        $(".redeem-modal").show();
        $(".cart-collection-items button" ).on( "click", function() {
          var dataAction = $(this).attr("data-action");

          if(dataAction == 'redeem'){
            localStorage.setItem("cartItemCollection", "gift_item");
            $.post('/cart/clear.js',function(cart){
              $.ajax({
                type: 'POST', 
                url: '/cart/add.js',
                dataType: 'json', 
                async:false,
                data:{quantity: 1,id: reedemid,properties:{"Gift":"Reedem Points"}},
                success: function(){
                  window.location.replace(lang+"/pages/checkout-custom?circle="+circle+'&point='+point);
                }
              });
            });
          } else {
            $(".redeem-modal").hide();
            window.location.replace(lang+"/cart/");
          }
        })

      } else {
        $.post('/cart/clear.js',function(cart){
          if(reedemid != id){
            $.ajax({
              type: 'POST', 
              url: '/cart/add.js',
              dataType: 'json', 
              async:false,
              data:{quantity: 1,id: reedemid,properties:{"Gift":"Reedem Points"}},
              success: function(){
                window.location.replace(lang+"/pages/checkout-custom?circle="+circle+'&point='+point);
              }
            }); 
          }else{
            window.location.replace(lang+"/pages/checkout-custom?circle="+circle+'&point='+point);
          }
        })  
      } 
    } else {
      localStorage.setItem("cartItemCollection", "gift_item");
      $.ajax({
        type: 'POST', 
        url: '/cart/add.js',
        dataType: 'json', 
        async:false,
        data:{quantity: 1,id: reedemid,properties:{"Gift":"Reedem Points"}},
        success: function(){
          window.location.replace(lang+"/pages/checkout-custom?circle="+circle+'&point='+point);
        }
      });
    }
  },'json')

});
 


$(function() {
  var lang = '';
  var current_lang = document.querySelector("html").getAttribute('lang');
  if(current_lang == 'el'){
    lang = "/el";
  }else{
    lang = "";
  }

  $('#logout-clear').on('click',function(e){
         localStorage.clear()
    e.preventDefault();
    $.ajax({
      type: "POST",
      dataType: 'json',
      url: '/cart/clear.js',
      success: function(){
      window.location.href =  lang+'/account/logout'
    },
           error:function(){
window.location.href =  lang+'/account/logout'
    }
  });
})
});



 


  
      $(function() {
    $('#logout-clearr').on('click',function(e){
      e.preventDefault();
      $.ajax({
        type: "POST",
        url: '/cart/clear.js',
        success: function(){

           window.location.href =  '/account/logout'
        },
        dataType: 'json'
      });
  	})
  });


function deleteAllCookies() {
    var cookies = document.cookie.split(";");

    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var eqPos = cookie.indexOf("=");
        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
};


var getCustomerId = function () {
    
    try {
        let curr = window.ShopifyAnalytics.meta.page.customerId;
        if (curr !== undefined && curr !== null && curr !== "") {
            return curr;
        }
    } catch (e) { }
    try {
        let curr = window.meta.page.customerId;
        if (curr !== undefined && curr !== null && curr !== "") {
            return curr;
        }
    } catch (e) { }
    try {
        let curr = _st.cid;
        if (curr !== undefined && curr !== null && curr !== "") {
            return curr;
        }
    } catch (e) { }
    try {
        let curr = ShopifyAnalytics.lib.user().traits().uniqToken;
        if (curr !== undefined && curr !== null && curr !== "") {
            return curr;
        }
    } catch (e) { }
    return null;
}

$(function() {
  $('.google.bt').on('click',function(e){
    $('.h_google_button.h_google_center').click();
  })

  $('.facebook_pop .continue').on('click',function(e){
    $('.h_facebook_button.h_facebook_center').click();
  })
  
  $('.forgot-pwd #RecoverPassword').on('click',function(e){
    $('.customers-login').addClass('recover_active');
  })
  
  $('.reward_circle_main .text_part .btn_link').hover(function(){
    $('.reward_circle_main').toggleClass('product_active');
  })
  
})

/************* reset password *********/
$(function(){
  $('.recover_form .cancle').on('click',function(e){
    $('.customers-login').removeClass('recover_active');
    $('.rec_cover').removeClass('email-error'); 
    $('#RecoverEmail-email-error').hide();
    $('#RecoverEmail').val('');
  });
  
  $('.rec_cover input[type="email"]').on("input",function (e) { 
    $('.rec_cover').removeClass('email-error'); 
    $('#RecoverEmail-email-error').hide();
    
    if ($(this).val() == '') {
      $('#RecoverPasswordForm .btn').addClass('disabled');
    } else if(IsEmail($(this).val())==false){
      $('#RecoverPasswordForm .btn').addClass('disabled');
    } else {
      $('#RecoverPasswordForm .btn').addClass('emailChecker').removeClass('disabled');
    }
  });

  function IsEmail(email) {
    var regex = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    if(!regex.test(email)) {
      return false;
    }else{
      return true;
    }
  }

  $(document).on("click", '.emailChecker', function(event) {  
    var email =$('.recover_form [name="email"]').val();
    var url = "https://api.korresfamily.com/api/v1/Emailverification?email="+email;

    $.ajax({
      url: url,
      type: 'GET',
      success:function(res){
        if(res.status == false){
          $('.rec_cover').addClass('email-error'); 
          $('#RecoverPasswordForm .btn').addClass('disabled');
          $('#RecoverEmail-email-error').show();
        } else{ 
          localStorage.setItem("reset_success", true);
          $('#RecoverPasswordForm input[type="submit"]').trigger('click');	  
        }
      },
      error: function (error) {
        console.log(error);
      }
    });
  });

  $(function(){
    var href = localStorage.getItem("reset_success");
    if(href == 'true'){
      localStorage.removeItem('reset_success');
      $('#ResetSuccess').show();
      $('#CustomerLoginForm').hide();
    }

    $(document).on("click", '.okay_now', function(event) {  
      $('.reset-success').hide();
      $('.login-card').show();
    });
  });
})
/************* end reset password *********/

$(document).ready(function(e){
  let search = '';
  var check_ship = $('.ship_method#del3').prop('checked');
  if(check_ship){
    $('.billing_detail .del_price').html('At store').css('visibility','visible');
  }else{
    $('.billing_detail .del_price').html('Deliver by courier').css('visibility','visible');
  }
  if($('body').hasClass('collection')){
    const url = window.location.origin + window.location.pathname;
    var collectionUrl = $('.wrapper_tabcontent').data('collection_url');
    var activeTags = [];
    var filter_item = $('.filter-blck:checked');
    search = window.location.search;
    var productsContainer = $('.wrapper_tabcontent .product-container');
    var last_url = window.location.pathname;
    last_url = decodeURI(last_url);
    last_url = last_url.split('/');
    var tag_fils = '';
    var lang = '';
    var current_lang = document.querySelector("html").getAttribute('lang');
    if(current_lang == 'el'){
      tag_fils = last_url[4]
    }else{
      tag_fils = last_url[3]
    }
    arr =  $.unique(tag_fils.split('+'));
    data = arr.join("+"); //get unique string back with 
    var tag_filled = data;
    var tag_fil = tag_filled.split('-').join(" ");
    var all_tag = tag_fil.split('+');
    var len = all_tag.length;
    var check_tag = tag_filled.split('+');
    if(tag_fil != ''){
      for(var i = 0;i<=len;i++){
        if(i < len){
          $('.filter_option .tags_list').css('display','flex');
          $('.filter-blck[value="'+check_tag[i]+'"]').attr('checked',true);
          var check_fill_data = $('.fill_desktop .filter-blck[value="'+check_tag[i]+'"]').siblings('label').text();
          var type = $('.filter-blck[value="'+all_tag[i]+'"]').parents('.type-filter').data('type');
          var tagName = all_tag[i].replaceAll('_',' ');
          var listCheck = [];
          $(".fill_desktop .filter-blck:checked").siblings('label').each(function() {
            listCheck .push($(this).text().toLowerCase());
          });
          var check_list = listCheck;
          $('a.custom_tag_txt').html(listCheck.join(' + '));
          var obj = "<label class='tag' data-tag='"+check_tag[i]+"'>";
          obj += "<span class='tag_nm ll'>"+check_tag[i].replace(/\-/g, " ")+"</span>";
          obj += "<span class='cls'><img src='https://cdn.shopify.com/s/files/1/0515/5785/9489/files/cross_753077f2-e923-4856-bc2c-4bfedc59309d.png?v=1634550402'></span>";
          obj +="</label>";        
          $('.filter_option .tags_list').append(obj);
        }
      }
    }
    //console.log('url new'+tag_fil);
  }

  if (search.indexOf('page') !== -1) {
    const pageParam = search.split("&")[0];
    search = search.replace(pageParam, '').replace('&', '?');
  }
  
  if($('body').hasClass('enable_pushnotification')){
  	console.log('pushnotienable');
    if ("Notification" in window) {
      var permission = Notification.permission;

      if (permission === "denied" || permission === "granted") {
        return;
      }

      Notification
      .requestPermission()
      .then(function() {
        //         var notification = new Notification("Hello, world!");
      });
    }
  }
 
  var href = window.location.href;
  if(href.indexOf("#recover") > -1){
    $(document).find('.form-message.form-message--success').show();
    setTimeout(function(e){
      $(document).find('.form-message.form-message--success').hide();
    },3000)
  }
})
$(function(){

  if($('#slider').length > 0){
    $('#slider').on('change', function(){
      var val = parseInt($(this).val());
      var $circle = $('#svg #bar');
      var $circle1 = $('#svgcontainer .dot')
      $('#svgcontainer').attr('data-pct',val);
      if (isNaN(val)) {
        val = 100; 
      }
      else{
        var r = $circle.attr('r');
        var c = Math.PI*(r*2);
        if (val < 0) { val = 0;}
        if (val > 100) { val = 100;}
        var pct = ((100-val)/100)*c;
        $circle.css({ strokeDashoffset: pct});
        var pctt = (parseFloat(val)*3.6);
        console.log(pctt);
        var translate = 'translateY(-50%) rotate('+pctt+'deg)'
        $('#svgcontainer .dot').css('transform',translate);
      }
    });
  
    var yb = { id : function(str){return document.getElementById(str)} };

    function showSliderValue(){
      yb.id('slidervalue').innerHTML = yb.id('slider').value * 20+140;
    }

    showSliderValue();
    setProgress();

    yb.id('slider').oninput = function(){showSliderValue(); setProgress()};
    yb.id('slider').onchange = function(){showSliderValue(); setProgress()};
  }
  
  function setProgress(){
    var radius = yb.id('progress').getAttribute('r');
    var circumference = 2 * Math.PI * radius;

    var progress_in_percent = yb.id('slider').value;
    var progress_in_pixels = circumference * (100-progress_in_percent)/100;
    yb.id('progress').style.strokeDashoffset = progress_in_pixels+'px';

    if(yb.id('slider').value < 25){
      yb.id('progress').style.stroke = '#fff';
      yb.id('slidervalue').style.color = '#000';
    }
    else if(yb.id('slider').value >= 75){
      yb.id('progress').style.stroke = '#fff';
      yb.id('slidervalue').style.color = '#000';
    }
    else{
      yb.id('progress').style.stroke = '#fff';
      yb.id('slidervalue').style.color = '#000';
    }
  }
});



$(function(){
    $(".faq_main .set > a").on("click", function() {
      if ($(this).hasClass("active")) {
        $(this).removeClass("active");
        $(this)
        .siblings(".content")
        .slideUp(200);
        $(".set > a i")
        .removeClass("fa-minus")
        .addClass("fa-plus");
      } else {
        $(".set > a i")
        .removeClass("fa-minus")
        .addClass("fa-plus");
        $(this)
        .find("i")
        .removeClass("fa-plus")
        .addClass("fa-minus");
        $(".set > a").removeClass("active");
        $(this).addClass("active");
        $(".content").slideUp(200);
        $(this)
        .siblings(".content")
        .slideDown(200);
      }
    });
  
  $("#filter").keyup(function() {
    // Retrieve the input field text and reset the count to zero
    var filter = $(this).val(),
        count = 0;

    // Loop through the comment list
    $('.accordion-container .set').each(function() {


      // If the list item does not contain the text phrase fade it out
      if ($(this).text().search(new RegExp(filter, "i")) < 0) {
        $(this).hide();  // MY CHANGE

        // Show the list item if the phrase matches and increase the count by 1
      } else {
        $(this).show(); // MY CHANGE
        count++;
      }

    });

  });
  });

$(function () {
  $('.contact-page input,.contact-page textarea').keyup(function () {
    if ($(this).val() == '') {
      $('.submit-btn').prop('disabled', true);
    } else {
      $('.submit-btn').prop('disabled', false);
    }
  });
  
  
  $('.dot_lk').each(function(){
    var datanumber = $(this).data('level');
    if(!$.isNumeric(datanumber)){
      $(this).remove();
      console.log('yes its comes here')
    }
  });
  
  
  $('.sort_item').on('click',function(){
    var value = $(this).data('value');
    var href = window.location.pathname;
    window.location.replace(href+'?sort_by='+value);
  });
  
  $('.delivery_part .option_box .add_new').click(function() {
    $('.checkout_cover').addClass('form_active');
  });
 
  
//   Circle main page
  $(document).on('click','.gift_main ul.tabs li',function(){
    var tab_id = $(this).attr('data-tab');

    $('.gift_main ul.tabs li').removeClass('current');
    $('.gift_main .tab-content').removeClass('current');

    $(this).addClass('current');
    $("#"+tab_id).addClass('current');
  })  
});
$('.delivery_part .cover_addresses .select_cover').on('click',function(e){
  $('.delivery_part .cover_addresses .select_cover').removeClass('active');
  $(this).addClass('active');
})

//TOGGLING NESTED ul
$(".drop-down .selected a").click(function() {
    $(".drop-down .options ul").toggle();
});

/*********************** Custom checkout *******************/
$('.ship_method').on('change',function(e){
  var value = $(this).val();
  var address = $(this).parents('.input_cover').find('.active').find('label').html();
  $('.shipping_part.section_div .pickup span').html(value);
  $('.shipping_part.section_div .address span').html(address);
  $('.shipping_form').hide();
  $('.shipping_detail').show();
 
  if(value == 'Delivery Courier'){
    $('.store-selection').hide();
    $('.ship-selection').show();
    $('.pickup_store').hide();
    $('.delivery_courier').show();
    $('.payment_part').find('.inner_wrap .input_cover.play_store').hide();
    $('.billing_detail').find('.del_price').addClass('active');
    $('.cover_addresses').addClass('active');
	$('.billing_detail .del_price').html('Deliver by courier').css('visibility','visible');
    $('#proceed_checkout').prop('enable',true)
    $('#proceed_checkout').addClass('enabled');
    var from_date = $(this).parents('.input_cover').find('.d_courier').data('fromdate');
    var to_date = $(this).parents('.input_cover').find('.d_courier').data('todate');
    var estimation = from_date+' - '+to_date;
    $('.billing_detail .date-expected').html(estimation);
  }else{
    $('.pickup_store').show();
    $('.delivery_courier').hide();
    $('.store-selection').show();
    $('.ship-selection').hide();
    $('.payment_part').find('.inner_wrap .input_cover.play_store').show();
    $('.billing_detail').find('.del_price').removeClass('active');
    $('.cover_addresses').removeClass('active');
    $('.billing_detail .del_price').html('At store').css('visibility','visible');
    $('#proceed_checkout').prop('enable',false)
    $('#proceed_checkout').removeClass('enabled')
    var from_date = $(this).parents('.input_cover').find('.d_courier').data('fromdate');
    var to_date = $(this).parents('.input_cover').find('.d_courier').data('todate');
    var estimation = from_date+' - '+to_date;
    $('.billing_detail .date-expected').html(estimation);
  }
})

$('.ship_method_mob').on('change',function(e){
  var value = $(this).val();
  var address = $(this).parents('.input_cover').find('.active').find('label').html();
  $('.shipping_part.section_div .pickup span').html(value);
  $('.shipping_part.section_div .address span').html(address);
  $('.shipping_form').hide();
  $('.shipping_detail').show();
 
  if(value == 'Delivery Courier'){
    $('.store-selection').hide();
    $('.ship-selection').show();
    $('.pickup_store').hide();
    $('.delivery_courier').show();
    $('.payment_part').find('.inner_wrap .input_cover.play_store').hide();
     $('.billing_detail').find('.del_price').addClass('active');
    $('.cover_addresses').addClass('active');
	$('.billing_detail .del_price').html('Deliver by courier').css('visibility','visible');
    $('#proceed_checkout').prop('enable',true)
    $('#proceed_checkout').addClass('enabled');
    var from_date = $(this).parents('.input_cover').find('.d_courier').data('fromdate');
    var to_date = $(this).parents('.input_cover').find('.d_courier').data('todate');
    var estimation = from_date+' - '+to_date;
    $('.billing_detail .date-expected').html(estimation);
  }else{
    $('.store-selection').show();
    $('.ship-selection').hide();
    $('.pickup_store').show();
    $('.delivery_courier').hide();
    $('.payment_part').find('.inner_wrap .input_cover.play_store').show();
    $('.billing_detail').find('.del_price').removeClass('active');
    $('.cover_addresses').removeClass('active');
    $('.billing_detail .del_price').html('At store').css('visibility','visible');
    $('#proceed_checkout').prop('enable',false)
    $('#proceed_checkout').removeClass('enabled')
    var from_date = $(this).parents('.input_cover').find('.d_courier').data('fromdate');
    var to_date = $(this).parents('.input_cover').find('.d_courier').data('todate');
    var estimation = from_date+' - '+to_date;
    $('.billing_detail .date-expected').html(estimation);
  }
})

$('.payment').on('change',function(e){
  var value = $(this).val();
  if(value == 'pay-online'){
    $('.payment_part').find('.pay_online').addClass('active');
    $('#proceed_checkout').prop('enable',true)

  }else{
    $('.payment_part').find('.pay_online').removeClass('active');
    $('#proceed_checkout').prop('enable',false)
  }
}) 

$('.pay_online .close_ic').on('click',function(e){
  $('.payment_part').find('.pay_online').removeClass('active');
})  

function getUrlParameterCheckout(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return typeof sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
    return false;
};
var circleName = getUrlParameterCheckout('circle');
$('.circle-name').text(circleName);

$('.cover_addresses .options ul li a:not(.add_new_address)').on('click',function(e){
  var address = $(this).find('.address_orig').html();
  var id = $(this).data('id');
  $('.ship-selection .addresses').hide();
  $('.'+id).show();
  
  $('.shipping_form').hide();
  $('.shipping_detail').show();
  $(this).parents('.cover_addresses').find('.update').html(address);
  $(this).parents('.cover_addresses').find('a').attr("data-address", id);
  $(this).parents('.cover_addresses').find('.options ul').css('display','none');
  
  $('.addresses').removeClass('active').hide();
  $('.addresses.'+id).addClass('active').show();
})

$('.cover_addresses .drop-down.select_cover .selected').on('click',function(e){
  $(this).parents('.cover_addresses').find('.options ul').css('display','block');
})

$('#proceed_checkout').on('click',function(e){
  e.preventDefault();
  var check_cod = $('.payment:checked').val();
  var custid = $(this).data('custid');
  var custEmail = $(this).data('custemail');
  var circle = getUrlParameter('circle');
  var point = getUrlParameter('point');
  var tag = '';
  
  if((circle != undefined && point != undefined) || ( circle != false && point != false)){
    tag = point;
  }else{
    tag = '';
  }

  var items = {};
  var data = [];
  var el = $(this);
  
  var first = $('.delivery_courier .addresses.active .fname').text();
  var lname = $('.delivery_courier .addresses.active .lname').text();
  var add = $('.delivery_courier .addresses.active .add').text();
  var zipcode = $('.delivery_courier .addresses.active .pcode').text();
  var cityadd = $('.delivery_courier .addresses.active .cities').text();
  var country = $('.delivery_courier .addresses.active .country').text();
  var phones = $('.delivery_courier .addresses.active .tel').text();
  var shiping_method = $('input[name="radio-group_1"]:checked').val();
  var pickup_location = $('.pickuplocation').text();
  
  el.prop('disabled',true)
  $.get('/cart.js',function(cart){
    items = cart.items;
    var len = items.length;
    $.each(items,function(index,item){
      var key = item.key;
      var price = $('[bss-b2b-cart-item-key="'+key+'"]').text();
      price = price.replace('€','');
      price = parseFloat(price.replace(',','.'));
      price = price * 100;
      item.final_price = price;
      item.price = price;
      item.original_price = price;
      item.discounted_price = price;
      item.line_price = price;
      item.original_line_price = price;
      item.final_line_price = price;
      if(index == len - 1){
        if(tag == ''){
          var ordertag = "";
        }else{
          var ordertag = tag;
        }
        
        $.ajax({
        type: "POST",
        url: "https://api.korresfamily.com/api/v1/MarketplaceItem/AddGiftOrderbyshopify",
        async:false,
        dataType: 'json',
        data: {
          	"line_items":items,
            "customer_id":custid,
          	"contact_email": custEmail,
          	"token": "",
          	"order_number": "",
            "financial_status":'pending',
          	"tags": ordertag,
          	"total_price": 0,
          	"id": "",
         	"shiping_method": shiping_method,
          	"pickup_location": pickup_location,
          	"shipping_address": "",
          	"shipping_address.address2": "",
          	"billing_address.first_name": first,
          	"billing_address.last_name": lname,
            "billing_address.address1": add,
            "billing_address.city": cityadd,
            "billing_address.zip": zipcode,
          	"billing_address.country": country,
            "billing_address.phone": phones
        },
        success: function(data){
          $('.order_name').html(data.orderid);
          $('.custom_currency').html('€ 0')
          $('.checkout_outer').addClass('submit_success');
          $('.Success_section').show();
          $('.placed-products').show();
	
          var check_ship = $('.ship_method#del3').prop('checked');
          if(check_ship){
            $('.billing_detail .del_price').html('FREE(Pickup from Store)').css('visibility','visible');
          }else{
            $('.billing_detail .del_price').html('Deliver by courier').css('visibility','visible');
          }
          
          
          $('html,body').animate({
            scrollTop:0
          },500)
          var order_name = data.orderid;
          var orderTotal = '0';
          var check_enable = "Notification" in window;
          if($('body').hasClass('enable_pushnotification')){
            if (check_enable == true) {
              var permission = Notification.permission;
              if(orderTotal > 0){
                Notification
                .requestPermission()
                .then(function() {
                  var notification = new Notification("Your Order "+order_name+" Placed Successfully!");
                });
              }else{
                Notification
                .requestPermission()
                .then(function() {
                  var notification = new Notification("Your have successfully reedem your gift!");
                });
              }
            }
          }
          $.post('/cart/clear.js',function(){
          },'json')
        },
        error: function(res){
          setTimeout(function(e){
          	location.reload();
          },500);
        }
      });
      }
    })
    
  },'json')
})

$('#proceed_checkout_mob').on('click',function(e){
  e.preventDefault();
  var check_cod = $('.payment:checked').val();
  var custid = $(this).data('custid');
  var custEmail = $(this).data('custemail');
  var circle = getUrlParameter('circle');
  var point = getUrlParameter('point');
  var tag = '';
  
  if((circle != undefined && point != undefined) || ( circle != false && point != false)){
    tag = point;
  }else{
    tag = '';
  }

  var items = {};
  var data = [];
  var el = $(this);
  
  var first = $('.delivery_courier .addresses.active .fname').text();
  var lname = $('.delivery_courier .addresses.active .lname').text();
  var add = $('.delivery_courier .addresses.active .add').text();
  var zipcode = $('.delivery_courier .addresses.active .pcode').text();
  var cityadd = $('.delivery_courier .addresses.active .cities').text();
  var country = $('.delivery_courier .addresses.active .country').text();
  var phones = $('.delivery_courier .addresses.active .tel').text();
  var shiping_method = $('input[name="radio-group_1"]:checked').val();
  var pickup_location = $('.pickuplocation').text();
  
  el.prop('disabled',true)
  $.get('/cart.js',function(cart){
    items = cart.items;
    var len = items.length;
    $.each(items,function(index,item){
      var key = item.key;
      var price = $('[bss-b2b-cart-item-key="'+key+'"]').text();
      price = price.replace('€','');
      price = parseFloat(price.replace(',','.'));
      price = price * 100;
      item.final_price = price;
      item.price = price;
      item.original_price = price;
      item.discounted_price = price;
      item.line_price = price;
      item.original_line_price = price;
      item.final_line_price = price;
      if(index == len - 1){
        if(tag == ''){
          var ordertag = "";
        }else{
          var ordertag = tag;
        }
        
        $.ajax({
        type: "POST",
        url: "https://api.korresfamily.com/api/v1/MarketplaceItem/AddGiftOrderbyshopify",
        async:false,
        dataType: 'json',
        data: {
          	"line_items":items,
            "customer_id":custid,
          	"contact_email": custEmail,
          	"token": "",
          	"order_number": "",
            "financial_status":'pending',
          	"tags": ordertag,
          	"total_price": 0,
          	"id": "",
          	"shiping_method": shiping_method,
          	"pickup_location": pickup_location,
          	"shipping_address": "",
          	"shipping_address.address2": "",
          	"billing_address.first_name": first,
          	"billing_address.last_name": lname,
          	"billing_address.address1": add,
          	"billing_address.city": cityadd,
          	"billing_address.country": country,
            "billing_address.zip": zipcode,
            "billing_address.phone": phones
        },
        success: function(data){
          $('.order_name').html(data.orderid);
          $(".checkout-mob-step-first").hide();
          $(".checkout-mob-step-second").hide();
          $(".checkout-mob-step-third").hide();
          $(".checkout-mob-step-fourth").show();
          $(".Success_section").show();
	
          var check_ship = $('.ship_method#del3').prop('checked');
          if(check_ship){
            $('.billing_detail .del_price').html('FREE(Pickup from Store)').css('visibility','visible');
          }else{
            $('.billing_detail .del_price').html('Deliver by courier').css('visibility','visible');
          }
          
          
          $('html,body').animate({
            scrollTop:0
          },500)
          var order_name = data.orderid;
          var orderTotal = '0';
          var check_enable = "Notification" in window;
          if($('body').hasClass('enable_pushnotification')){
            if (check_enable == true) {
              var permission = Notification.permission;
              if(orderTotal > 0){
                Notification
                .requestPermission()
                .then(function() {
                  var notification = new Notification("Your Order "+order_name+" Placed Successfully!");
                });
              }else{
                Notification
                .requestPermission()
                .then(function() {
                  var notification = new Notification("Your have successfully reedem your gift!");
                });
              }
            }
          }
          $.post('/cart/clear.js',function(){
          },'json')
        },
        error: function(res){
          setTimeout(function(e){
          	location.reload();
          },500);
        }
      });
      }
    })
    
  },'json')
})


/********************* End custom checkout ****************/

$(document).ready(function(e){
  var value = $('.ship_method:checked').val();
  var address = $('.ship_method:checked').parents('.input_cover').find('.active').find('label').html();
  $('.shipping_part.section_div .pickup span').html(value);
  $('.shipping_part.section_div .address span').html(address);
  var custid = $('body').data("original");
  var pharmacy_nm = '';
  var tags = null;
  var note = null;
  let notificationHt = 0;
  $.get('https://api.korresfamily.com/api/v1/profileapi/GetUserdatabyUserid?id='+custid,function(customer){
    var tags = customer.data.tags;
    var note = customer.data.note;
     
    if(tags != null){
      	var arr = tags.split(',');
      	$.each( arr, function( key, value ) {
          if(/^\d+$/.test(value)) { 
         	$('#PickUpStoreAsId').text(value);
           
          }
        });
    }
    console.log('--note'+note);
    if(note != null){
      if(note.indexOf('default_pharmacy') > -1){
        $('.pickuplocation').text(note.split('default_pharmacy')[1].replace(':',''));
        
        pharmacy_nm = note.split('default_pharmacy')[1].replace(':','').split(',')[0];
        $('.pickuplocation_pharm_nm').text(pharmacy_nm);
        $('.address span').text(note.split('default_pharmacy')[1].replace(':',''));
        $('#InputPickUpStore').val(note.split('default_pharmacy')[1].replace(':',''));
        var date = new Date(customer.data.created_at);
        var str = $('.pickuplocation').text();
        var str = str.split(',');
        $('.thank_you_list .pickuplocation').text(str[0])
        $('.pickpup_add').text(str[1])
        if (str[2] !== undefined) {
      		var citypost = str[2].split(' ');
            $('.city').text(citypost[1])
            if (citypost[2].length) {
                $('.postalcode').text(citypost[2]+' '+citypost[3])
            }    
        }
        
        if(note.split('default_pharmacy')[1].length < 10){
          $('.no-bag-message').removeClass('hide');
          $('body').addClass('no-bag')
              console.log('madhav mahesh');
          if($(window).width() <= 768){
            notificationHt = $('.no-bag-message').height();
            $('.featured-col-image').css('margin-top',notificationHt);
            $('.main-product-container').css('padding-top',notificationHt*1.2);
          }
        }
      }else{    
		$('.no-bag-message').removeClass('hide');
        $('body').addClass('no-bag')
			console.log('madhav mahesh');
        if($(window).width() <= 768){
          notificationHt = $('.no-bag-message').height();
          $('.featured-col-image').css('margin-top',notificationHt);
          $('.main-product-container').css('padding-top',notificationHt*1.2);
        }

        $('#proceed_checkout').prop('enable',true) ;
        $('.location_pick').next('p').text('Please select a store under My Settings')
      }
    }else{
		$('.no-bag-message').removeClass('hide');
        $('body').addClass('no-bag')
			console.log('madhav mahesh');
        if($(window).width() <= 768){
          notificationHt = $('.no-bag-message').height();
          $('.featured-col-image').css('margin-top',notificationHt);
          $('.main-product-container').css('padding-top',notificationHt*1.2);
        }
      
      $('#proceed_checkout').prop('enabled',true) ;
      $('.location_pick').next('p').text('Please select a store under My Settings')
    }
    
    $('.joined-date span').text(customer.data.created_at);
    
    var d = date.getDate();
    var m = date.getMonth() + 1;
    var y = date.getFullYear();
    if(!isNaN(d)){ 
      $('.date').text('Joined: '+d+'/'+m+'/'+y);
    }
    
  },'json')
  
    function clearCartnoPharmacy(actionPass = 'no'){
         $.get('https://api.korresfamily.com/api/v1/profileapi/GetUserdatabyUserid?id='+custid,function(customer){
                // alert(customer.data.address_id);
           console.log('log...'+customer.data.note);
           if(customer.data.note == null){
             // alert('test123');
               $.ajax({
                 type: "POST",
                 dataType: 'json',
                 url: '/cart/clear.js',
                 success: function(){
                  location.reload();
                 },
                 error:function(){
                   location.reload();
                 }
               });
           }else{
             if(actionPass == 'yes'){
                window.location.replace('/checkout/?step=contact_information')
             }
           }
           
      });
    }
    
  $('.primary-btn.checkout').click(function(e){
    	e.preventDefault()
        clearCartnoPharmacy('yes');
	});

  let itemCount = $('.cart .items-count').text();
  if(itemCount > 0){
     clearCartnoPharmacy();
  }
  
setTimeout(function(){
    $('span.close1').click(function(){    
      $('.no-bag-message').addClass('hide');
      if($(window).width() <= 768){        
          $('.featured-col-image').css('margin-top','auto');
      	  $('.main-product-container').css('padding-top','30px');
        
      }
    });
  },2000);

});


/************ My notification ***********/

/********** End my notification *********/


$('.breadcrumbs__link').on('click',function(){
  var href = $(this).data('href');
  var top = $(href).offset().top - 169;
  $('html,body').animate({
    scrollTop: top
  },1000)
});

$('.options .add_new_address').on('click',function(e){
  $('.shipping_form').show();
  $('.shipping_detail').hide();
  var current = $(this).parents('li').html();
  $('.cover_addresses').find('.update').html(current);
  $(this).parents('.cover_addresses').find('.options ul').css('display','none');
})

$('#add_address').on('click',function(e){
  e.preventDefault();
  $(this).prop('disabled',true)
  var first = $(this).parents('.shipping_form').find('#firstname').val();
  var lname = $(this).parents('.shipping_form').find('#lastname').val();
  var address = $(this).parents('.shipping_form').find('#address').val();
  var zipcode = $(this).parents('.shipping_form').find('#zipcode').val();
  var cityadd = $(this).parents('.shipping_form').find('#city').val();
  var countrya = $(this).parents('.shipping_form').find('#country').val();
  var phones = $(this).parents('.shipping_form').find('#phone').val();
    
  var cust_id = $(this).parents('.shipping_form').data('custoid');
  var url = "/admin/api/2021-07/customers/"+cust_id+"/addresses.json";
  $.ajax({
    type: "POST",
    url: "https://api.korresfamily.com/api/v1/profileapi/AddUserAddressByShopify",
    async:false,
    dataType: 'json',
    data: {
        	"address1": address,
        	"city": cityadd,    
        	"first_name": first,
        	"last_name": lname,
        	"phone": phones,        
        	"country": countrya,
        	"zip": zipcode,
      		"customer":cust_id
    	},
    success: function(data){
      setTimeout(function(e){
        location.reload();
      },500);
    },
    error: function(res){
      console.log(res);
    }
  }).always(function(){
    setTimeout(function(e){
        location.reload();
      },500);
  });
  
})

$('#add_address_new').on('click',function(e){
  e.preventDefault();
  $('.add_address_inner').hide().removeClass('active');;
})

$('.add_address_cover input').on('keyup',function(e){
  var last = parseInt(checkrequire());
  console.log(last);
  if(last == 1){
    $('#add_address_new').removeAttr('disabled');
    console.log('valid');
  }else{
    $('#add_address_new').attr('disabled','true');
    console.log('invalid');
  }
})



function emailvalidate(value) {
  return new RegExp(/^(("[\w-\s]+")|([\w\-]+(?:\.[\w\-]+)*)|("[\w-\s]+")([\w\-]+(?:\.[\w\-]+)*))(@((?:[\w\-]+\.)*\w[\w\-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i).test(value);
}
var mysetting_valid = 0;
$('#InputName').on('keyup',function(e){
  console.log('keyup')
  if($('#InputName').val() != null && $('#InputName').val() != ''){
    $('.first-name').find('.error').html('');
  } else {    
    $('.first-name').find('.error').html('Enter First name')
  }  
})
$('#InputEmail').on('keyup',function(e){
 console.log(emailvalidate($(this).val()));
  if(emailvalidate($(this).val()) == false){
    $('.email_addresss').find('.error').html('Enter valid email address');
  }else{
    $('.email_addresss').find('.error').html('');
  }
})
$('#InputSurName').on('keyup',function(e){
  console.log('keyup')
  if($('#InputSurName').val() != null && $('#InputSurName').val() != ''){
    $('.last-name').find('.error').html('');
  }else{
    $('.last-name').find('.error').html('Enter last name');
  }
})


/********** Start customer update **********/
function ValidateDOB() {
  var dateString = $('#InputMonth').val();
  var regex = /(((0|1)[0-9]|2[0-9]|3[0-1])\/(0[1-9]|1[0-2])\/((19|20)\d\d))$/;
  
  if (regex.test(dateString)) {
    return true;
  } else {
    return false;
  }
}

$('.my_setting_main .add_address').on('click',function(e){
  $('.add_address_inner').show().addClass('active');
  $('.Update-customer-details').attr('disabled', true);
  $('.add_address_inner').find('input:text')
  .each(function () {
    $(this).val('');
  });
});

$('.my_setting_main .other_added').on('click',function(e){
  $('.add_address_inner').hide().removeClass('active');
  $('.Update-customer-details').attr('disabled', false);
});

$('.add_address_cover').on("input",function (e)  {
  var address = $('.add_address_cover').find('#address').val();
  var zipcode = $('.add_address_cover').find('#zipcode').val();
  var cityadd = $('.add_address_cover').find('#city').val();
  var countrya = $('.add_address_cover').find('#country').val();

  if (address == '' || zipcode == '' || cityadd == '' || countrya == '') {
    $('.Update-customer-details').prop('disabled', true);
  } else {
    $('.Update-customer-details').prop('disabled', false);
  }
});

$(document).on('click','.Update-customer-details',function(e){
  var _this = $(this);
  	$(this).addClass('disabled')
  	$(this).prop('disabled',true);
    var c_id =$('.add_address_cover').data('custoid');
    
    if($('.other_added').hasClass('selected')){
    	var def_address = $('.other_added.selected').data('custaddress');
    } else {
    	var def_address = $('.inner-page.form-page').data('defaddid');
    }
    
    var first = $('#InputName').val();
    var lname = $('#InputSurName').val();
    var address = $('#InputAddress').val();
    var dob = $('#InputMonth').val();
    var email = $('#InputEmail').val();
    var pickupstore = $('#InputPickUpStore').val();
    var pickupstoreAsId = $('#PickUpStoreAsId').text();
    var asTag = pickupstoreAsId+', DOB:'+dob;
    var phones = $('#InputMobileNumber').val();
    var notification = $('.news-letter input[type="checkbox"]').prop('checked');
    var push_noti = $('.push-notification input[type="checkbox"]').prop('checked');
  	
  	/* start of 5th May 2022 changes by Madhav */ 
    phones = phones.replace(/\s+/g, '');
    /* End of 5th May 2022 changes by Madhav */ 
        
    if($('.add_address_inner').hasClass('active')){
    	var first = $('.add_address_cover').find('#firstname').val();
      	var lname = $('.add_address_cover').find('#lastname').val();
      	var address = $('.add_address_cover').find('#address').val();
      	var zipcode = $('.add_address_cover').find('#zipcode').val();
      	var cityadd = $('.add_address_cover').find('#city').val();
      	var countrya = $('.add_address_cover').find('#country').val();
      	var phones = $('.shippiadd_address_coverng_form').find('#phone').val();
		var cust_id = $('.add_address_cover').data('custoid');
      
      	var addressIdSet = 0;
    } else {
    	var addressIdSet = def_address;
    }
    
    $.ajax({
        type: "POST",
        url: "https://api.korresfamily.com/api/v1/profileapi/UpdateShopifyProfile",
        async:false,
        dataType: 'json',
        data: {
            "id":c_id,
            "email":email,
            "first_name":first,
            "last_name":lname,
            "phone":phones,
          	"address_id": addressIdSet,
          	"nav_address": address,
          	"nav_city": cityadd,
          	"nav_country": countrya,
          	"nav_zip": zipcode,
            "dob":dob,
            "pickupstore":pickupstore,
            "tags":asTag,
            "newsletters":notification,
            "push_noti":push_noti
        },
        success: function(data){
          $('.error_phone').text("");
          /* start 21 june chnges by madhav */
          if(data.errorType == 'invalidPhone'){            
             $('.error_phone').text(data.message).css("display", "block");
              	_this.removeClass('disabled')
			  	_this.prop('disabled',false);
            }/* end 21 june chnges by madhav */
          else if(data.errorType == 'phone') {
            // Start of 9th May 2022 changes by Madhav
            $('.error_phone').text($('#mobile_number_already_exist').val()).css("display", "block");
            // End of 9th May 2022 changes by Madhav
              	_this.removeClass('disabled')
			  	_this.prop('disabled',false);

          } else {
            $('.register1').show();
            $('#divSaveModal').show();
            window.scrollTo(0,0);
           		 _this.removeClass('disabled');
			  	_this.prop('disabled',false);
          }
        },
        error: function(res){
          setTimeout(function(e){
          	location.reload();
          },500);
        }
      });
});
/********** End customer update **********/

var getUrlParameter = function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1),
        sURLVariables = sPageURL.split('&'),
        sParameterName,
        i;

    for (i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');

        if (sParameterName[0] === sParam) {
            return typeof sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
    return false;
};

var blog = getUrlParameter('circle');
var point = getUrlParameter('giftpoint');
$('.circle_title').html(blog+' gift');
$('.reedim_points').attr('data-circle',''+blog);
$('.reedim_points').attr('data-giftpoint',point);


$('.page-checkout-custom .info-detail-cover .info-icon').on('click',function(e){
	$(this).parents('.info-detail-cover').addClass('show_details');
})
$('.page-checkout-custom .info-detail-cover .info-details .info-close').on('click',function(e){
  $(this).parents('.info-detail-cover').removeClass('show_details');
})

$(".customers-login .input_cover .toggle-password").click(function() {

  $(this).toggleClass("fa-eye fa-eye-slash");
  var input = $(this).parent('.input_cover').find('input');
  if (input.attr("type") == "password") {
    input.attr("type", "text");
  } else {
    input.attr("type", "password");
  }
});

$(document).on('click','.expand_view',function(){
  $(this).parents('.gift_inner_cover').find('.gift_in.mt-3').toggle();
  $(this).parents('.collection_gift').toggleClass('width_full');
})

$(document).ready(function(){

  var list = $(".list_prod li");
  var numToShow = 3;
  var button = $("#show_more");
  var numInList = list.length;
  list.hide();
  if (numInList > numToShow) {
    button.show();
  }
  list.slice(0, numToShow).show();

  button.click(function(){
    var showing = list.filter(':visible').length;
    list.slice(showing - 1, showing + numToShow).fadeIn();
    var nowShowing = list.filter(':visible').length;
    if (nowShowing >= numInList) {
      button.hide();
    }
  });
    
  
});
$('.my-gift-inner .down_arrow').on('click', function(e) {
  $(this).parents('.sigle_prod_cover').toggleClass('collapsed');
  e.preventDefault();
});
 $('.user-mobile-close').click(function(){
$('.user-icon-popup').css("opacity","0");
})


$('.user-icon-popup').click(function(){
$(this).css("opacity","1");
})

// Show the first tab by default
$('.tabs-faq .tab_cover').hide();
$('.tabs-faq .tab_cover:first').show();
$('.tabs-nav-faq li:first').addClass('tab-active');

// Change tab class and display content
$('.tabs-nav-faq a').on('click', function(event){
  event.preventDefault();
  $('.tabs-nav-faq li').removeClass('tab-active');
  $(this).parent().addClass('tab-active');
  $('.tabs-faq .tab_cover').hide();
  $($(this).attr('href')).show();
});

$('.filter_list li h2').on('click', function(e) {
  $(this).parents('.filter_list li').toggleClass('collapsed');
  e.preventDefault();
});

$('.filter_option h3').on('click', function(e) {
  $(this).parents('.whole_cover').toggleClass('active');
  e.preventDefault();
});


function checkrequire(){
  var address = $('.shipping_form .field__input#address').val();
  var zipcode = $('.shipping_form .field__input#zipcode').val();
  var city = $('.shipping_form .field__input#city').val();
  var country = $('.shipping_form .field__input#country').val();
  var tel = $('.shipping_form .field__input#phone').val();
  var bool = 0;
  if(address != '' && zipcode != '' && city != '' && country != '' && tel != ''){
  	var bool = 1;
  }else{
  	var bool = 0;
  }
  return parseInt(bool);
}
$('.field__input#address').on('keyup',function(e){
  checkrequire();
  console.log(checkrequire());
})
$('.field__input#phone').on('keyup',function(e){
  var last = parseInt(checkrequire());
  console.log(last);
  if(last == 1){
  	$('.shipping_form #add_address').removeAttr('disabled');
    console.log('valid');
  }else{
  	$('.shipping_form #add_address').attr('disabled','true');
    console.log('invalid');
  }
})

$('.cover_addresses .add_new_address').click(function(){
  $('#proceed_checkout').attr('enabled','true');
})

$('.options li:first-child a').click(function(){
  $('#proceed_checkout').removeAttr('enabled');
})

$('.from_store:checked').each(function(e){
  $('#proceed_checkout').removeAttr('enabled');
})



$(".from_store").change(function() {
  var checked = $(this).is(":checked");
  if (checked) {
    $('#proceed_checkout').removeAttr('enabled');
  }
});

$(".from_delivery").change(function() {
  var checked = $(this).is(":checked");
  if (checked) {
    $('#proceed_checkout').attr('enabled');
  }
});

$('.field__input#phone').on('keyup',function(e){
  var last = parseInt(checkrequire());
  console.log(last);
  if(last == 1){
  	$('#proceed_checkout').removeAttr('enabled');
    console.log('valid');
  }else{
  	$('#proceed_checkout').attr('enabled','true');
    console.log('invalid');
  }
})

/* Start of 4th May 2022 chnages by Madhav */
$('.pick_cover .pick_edit').on('click', function(e) {
  $('.my_setting_main').addClass('active_picker');
  if($(window).width() <= 768){
    $('.small-map-text.map-panel-1.map-panel-mob').addClass('active_picker_1');
    $('body').addClass('active_picker_container');    
  }
  $('.inner-page.form-page').hide(); 
  $('.register_cover').show();
  $('.register').show();
   window.scrollTo(0,0);
  e.preventDefault();
});
$('.register .addBtn').on('click', function(e) {
  $('.my_setting_main').removeClass('active_picker');
  $('.small-map-text.map-panel-1').removeClass('active_picker_1');
  $('body').removeClass('active_picker_container');
  e.preventDefault();
});

  function openLocation_pick(){    
	$('.active_picker_1').removeClass('active_picker_1');
     $('body').removeClass('active_picker_container');
  }
/* End of 4th May 2022 chnages by Madhav */


/*============collection filter=======================*/
Shopify.queryParams = {};
if (location.search.length) {
  for (var aKeyValue, i = 0, aCouples = location.search.substr(1).split('&'); i < aCouples.length; i++) {
    aKeyValue = aCouples[i].split('=');
    if (aKeyValue.length > 1) {
      Shopify.queryParams[decodeURIComponent(aKeyValue[0])] = decodeURIComponent(aKeyValue[1]);
    }
  }
}

$(function() { 
  $('#sortBy')
  // select the current sort order
  .val('{{ collection.sort_by | default: collection.default_sort_by | escape }}')
  .bind('change', function() {
    Shopify.queryParams.sort_by = jQuery(this).val();
    location.search = jQuery.param(Shopify.queryParams).replace(/\+/g, '%20');
  }
       );
});

$('.cu_fll_list .fill_desktop.by-type .filter-blck').click(function(){
  $('.cu_fll_list .fill_desktop.by-type .filter-blck:checked').not(this).prop('checked', false);
});

$('.cu_fll_list .fill_desktop.by-need .filter-blck').click(function(){
  $('.cu_fll_list .fill_desktop.by-need .filter-blck:checked').not(this).prop('checked', false);
});

$('.cu_fll_list .fill_desktop.by-ingredient .filter-blck').click(function(){
  $('.cu_fll_list .fill_desktop.by-ingredient .filter-blck:checked').not(this).prop('checked', false);
});

$(document).on('change','.fill_desktop .filter-blck',function(e){
  const url = window.location.origin + window.location.pathname;
  var collectionUrl = $('.wrapper_tabcontent').data('collection_url');
  var activeTags = [];
  var filter_item = $('.fill_desktop .filter-blck:checked');
  let search = window.location.search;
  var productsContainer = $('.wrapper_tabcontent .product-container');
  
  if (search.indexOf('page') !== -1) {
    const pageParam = search.split("&")[0];
    search = search.replace(pageParam, '').replace('&', '?');
  }
  
  var activeItems = filter_item;
  
  activeItems.each(function (index, el) {
    var tag = $(el).val();
    if (tag) {
      activeTags.push(tag);
    }
  });
  
  var tagsUrl = activeTags.join('+');
  var newUrl = collectionUrl;
  
  if (tagsUrl) {
    newUrl += '/' + tagsUrl;
  }
  newUrl += search;
  window.location.replace(newUrl);
});

$(document).on('click','.tags_list .tag .cls',function(e){  
  var tag = $(this).parents('.tag').data('tag');
  $('.filter_option .tags_list .tag[data-tag="'+tag+'"]').remove();
  $('.type-filter .filter-blck[value="'+tag+'"]').prop('checked',false);
  var collectionUrl = $('.wrapper_tabcontent').data('collection_url');
  var productsContainer = $('.wrapper_tabcontent .product-container');
  var active_tag = [];
  var tagsUrl = '';
  setTimeout(function(e){
    $('.tags_list .tag').each(function(e){
      var title = $(this).data('tag');
      console.log('remain '+title);
      active_tag.push(title);
    })
    tagsUrl = active_tag.join('+');
    var newUrl = collectionUrl;
    if (tagsUrl){
      newUrl += '/' + tagsUrl;
    }
    console.log('new '+newUrl+' collection '+collectionUrl);
    window.location.replace(newUrl);
  },500);
});

$('.hero-desc--container #show-more').on('click',function(e){
  $('.product_desc_truncat').hide();
  $('.product_desc_full').show();
});

$('.hero-desc--container #show-more-content').on('click',function(e){
  $('.product_desc_truncat').show();
  $('.product_desc_full').hide();
});

$('.customers-account .main-wrap .tabs .tab-link').on('click',function(e){
  var d_id = $(this).data('tab');
  $('.customers-account .main-wrap .tabs .tab-link').removeClass('current');
  $('.customers-account .main-wrap .tab-content').removeClass('current');
  $(this).addClass('current');
  $('.customers-account .main-wrap #'+d_id).addClass('current');
});

$(window).on('load',function(e){
  setTimeout(function(e){
    $('.page-circle-main').removeClass('loading');
    $('.page-circle-main').addClass('loadded');
  },200);
}) 

$('[lang="el"] .wishlist_icon button').on('click',function(e){
  var link = $(this).find('a').attr('href');
  window.location.href = link;
});


$('.cloas_filter').on('click',function(e){
	$(this).parents('.whole_cover').removeClass('active');
});

$(document).ready(function(){
  var customerPoints = $('.gift_inner_cover.current').find('.hover_here_plz').data('points');
  customerPoints = parseInt(customerPoints);
  var len = $('.gift_inner_cover.current').find('.hover_here_plz').parents('.gift_inner_cover').find('.box').length;
  var src = '';
  var giftPoint = [];
  $('.gift_inner_cover.current').find('.hover_here_plz').parents('.gift_inner_cover').find('.box').each(function(index){
    var datagift = $(this).attr('data-giftvalue');
    datagift = parseInt(datagift);
    if(customerPoints < datagift){
      giftPoint.push(datagift);
    }
    if(index == len - 1){
      var point = Math.min.apply(Math,giftPoint);
      point = point - customerPoints;
      if(point != 'Infinity'){
        $('.gift_inner_cover.current').find('.hover_here_plz').find('.left_points').html(point);
      }
      // left_points
    }
  });
  
  if($('#current_point').length > 0){
    var currentPoint = $('#current_point').val();
    currentPoint = parseInt(currentPoint);
    var len = $('.points').length;
    $('.points').each(function(index){
      var point = $(this).val();
      if(currentPoint < point){
        giftPoint.push(point);
      }
      if(index == len - 1){
        var point = Math.min.apply(Math,giftPoint);
        $('.max_points').text(point);
        point = point - currentPoint;
        if(point != 'Infinity'){
          $('.remain_points').html(point);
        }
        // left_points
      }
    })
  }
  
  $('.hover_here_plz').hover(function(){
    var datapoints = $(this).attr('data-points');
    datapoints = parseInt(datapoints);
    var len = $(this).parents('.gift_inner_cover').find('.box.unlock_now.active_now').length;
    var src = '';
    $(this).parents('.gift_inner_cover').find('.box.unlock_now.active_now').each(function(index){
      var datagift = $(this).attr('data-giftvalue');
      datagift = parseInt(datagift);
      if(datapoints > datagift){
        src = $(this).find('img').attr('src');
      }
      if(index == len - 1){
        console.log(src);
        $('.points_re').append('<img src="'+src+'" class="collection_image_on_hover" width="150">')
      }
    });
  },function(){
    $('.collection_image_on_hover').remove();
  })
  $('.collection_in').each(function(){
    var length = $(this).find('.box').length;
    var levelname = $(this).data('levelname');
    //       <div class="coll_cover cover_two">
    $(this).find('.box').each(function(index){
      var ind = index + 1;
      if(ind%3 == 0 && index != 0){
        $(this).wrap('<div class="coll_cover cover_one '+levelname+'"></div>')
      }else{
        $(this).wrap('<div class="newthing"></div>')
      }
      if(index == length - 1){
//         coll_cover cover_two '+levelname+'
        var len = $(this).parents('.collection_in').find('.newthing').length;
        for(var i = 0; i < len ; i+=2){
          $(this).parents('.collection_in').find('.newthing').slice(i,i+2).wrapAll('<div class="coll_cover cover_two '+levelname+'"></div>');
        }
      }
    });
  });
  $(document).on('click','.hidethisone',function(){
    $('.welcome_gift_main').hide();
  });
  
  $(document).on('click','.unlock_gift',function(){
    var levelname = $(this).data('name');
    var giftPoint = $(this).attr('data-gift');
    var gift_name = $(this).data('giftname');
    
    var gift_case = $(this).data('case');
    $(".gift-item-earned, .product-info-locked, .product-info-unlocked").hide();
    $('.product_here').removeClass('gift-item-earned gift-item-locked');
    
    if(gift_case == 'earned'){
    	$('.product-info-earned').show();
      	$("#"+levelname+" .product_here").addClass("gift-item-earned");
    } else if(gift_case == 'unlock'){
    	$('.product-info-unlocked').show();
    } else {
    	$('.product-info-locked').show();
      	$("#"+levelname+" .product_here").addClass("gift-item-locked");
    }
    
    if(gift_name == 'Gift'){
    	if($('.class_'+levelname).length > 0){
          $('.class_'+levelname).show();
          $('.class_'+levelname).attr('data-giftpoint',giftPoint);
          $('html,body').animate({ scrollTop:0 },100)
          $('body').addClass('fixed_body')
        }
    }
  });
  $(document).on('click','.trip_gift_main',function(e){
    var name = $(this).data('username');
    var email = $(this).data('useremain');
    var phone = $(this).data('userphone');
    var loyalt_nm = $(this).data('lotterynm');
    var circle_nm = $(this).data('circle');
    var url = "https://api.korresfamily.com/api/v1/MarketplaceItem/lotterysbookingbyshopify?email="+email+"&Circle_Name="+circle_nm+"&Lottery_Name="+loyalt_nm;
    $.ajax({
      url: url,
      type: 'GET',
      success:function(res){
        console.log(res);
      },
      error: function (error) {
        console.log(error);
      }
    });        
  })
  
  //start of 27 june changes by madhav ###child popup 
  $('.container-child-popup .accept').click(function(e){
	var newurl = "https://api.korresfamily.com/api/v1/profileapi/setShopifypouptermcondition?userid="+$('body').attr('data-original');
  $.ajax({
      url: newurl,
      type: 'GET',
      async:false,
      dataType: 'json',
      success:function(data){
           
        if(data == true){
        	location.reload();
        }
      },
      error: function (error) {
        console.log(error);
      }
    });

  });
  
  if(document.referrer.indexOf(window.location.hostname) != -1){
    //console.log('window.location.hostname '+window.location.hostname)
    
    if(window.location.href.indexOf('product') != -1 ){
      $('.container-child-popup .prev_url > a').attr('href',document.referrer);    
    }else{
      $('.container-child-popup .prev_url > a').attr('href',window.location.href);    
      
    }
  }
 $('.open-child-popup').click(function(e){
      	e.preventDefault();
      	//alert('hello');
		$('.container-child-popup').show();
      	$('.modal').css('display','inline-block');
      	return false;
    });
 
  //end of 27 june changes by madhav ###child popup  
  
  $('.collection_in').each(function(){
    var len = $(this).find('.box').length;
    console.log(len);
    if(len > 3){
      $(this).parent('.collection_gift').find('.expand_view').show();
    }else{
      $(this).parent('.collection_gift').find('.expand_view').hide();
    }
  });
  
});

$(document).ready(function(){
  var checked = false;
  var href = location.href;
  var split = href.split("sort_by=");
  if(split[1] != null){
  		$('.'+split[1]).addClass('added').prop("checked", true);
  }
  //alert(split[1])
  
  $('.filter_list ul .list_inner input').each(function(){
    if($(this).is(':checked')){
    	checked = true;
    }   
  });
  
  /* 
  if(window.location.pathname.indexOf('collections') > 0 && checked == false ){ 
    	var url =  window.location.href.split('collections');
     console.log(checked+' check '+url);
      if(url[1].split('/').length > 2 ){
      	var newurl = window.location.href.split('/')[window.location.href.split('/').length - 1];
      	newurl = "/"+ newurl;
      	var furl = window.location.href.replace(newurl,'');
        console.log(furl);
        window.location.href = furl;
      }
  	}
  */
  //====Start of 17th May changes by madhav 
  if(localStorage.getItem('notification') == 'on'){
  		$('.user-icon-popup .nav-item.my-notifications').addClass('have-notifications'); 
  }
  //====End of 17th May changes by madhav
  
  $("li.user-icon").on('mouseover',function(){
    console.log('removed')
    $(".search-container--desktop").removeClass("show");
  });
  
  //====Start of 27th May changes by madhav
   	if( $(window).width() <= 768  ){    
  		$('.main-product-container').css({'margin-top':'70px'});    
  	}
  //====End of 27th May changes by madhav

  // start of 17 june changes by madhav 
  var current_url = window.location.href;  
  var shopUrl = $('body').attr('data-shop');
  $(document).on('click', 'a#order-submit, a > #signup_to_shop', function(e) {                      
    localStorage.setItem("return_url", window.location.href );                  
    localStorage.setItem("return_status", "true");
  });
  if(current_url.indexOf('/account/register') > 0 && localStorage.getItem("return_status") ==  'true') {                     
    $('.already-account-text a').attr('href','/account/login?return_url='+localStorage.getItem("return_url").replace(shopUrl,""));
  }  
  if(current_url.indexOf('/pages/hurray') > 0 && localStorage.getItem("return_status") ==  'true'){
  	window.location.href = localStorage.getItem("return_url").replace(shopUrl,"");
  }
  // End of 17 june changes by madhav 
  
//console.log('Window.storeUrl '+Window.shopUrl);
});

  function removeCart(handle){      
    var handle = handle;      
    if(handle.indexOf('?') > 0 ){
      handle = handle.split('?')[0];
    }  	
    jQuery.getJSON(handle+'.js', function(product) {
      var name = product.title;
      var price = product.price/100.00;
      var brand = product.vendor
      dataLayer.push({ ecommerce: null });
      dataLayer.push({
        'ecommerce': {
          'remove': { 
            'products': [{
              'name': name,
              'price': price,
              'brand': brand,
              'category': '',
              'quantity': 1
            }]
          }
        },
        'event': 'removeFromCart'
      });

    });
  }

/*********** Lottery term and condations **********/
$('.lottery-term-title').on('click',function(){
  	$(this).toggleClass("active");
	$(".lottery-term-desc").toggle();
});
/********* End Lottery term and condations ********/

/*********** Filter By high to low **********/
$('.dropdown-item').on('click',function(){
  var value = $(this).data('value');
  var href = window.location.pathname;
  window.location.replace(href+'?sort_by='+value);
});
/********* End filter By high to low ********/
if ($("body").hasClass("page-circle-gifts")) {
  var url = $(location).attr('href'),
    parts = url.split("type="),
    last_part = parts[parts.length-1];
    setTimeout(function() {
      var lengths = $('.class_'+last_part+' .product_here:not([style*="display: none"])').length;
      if(lengths > 1){
        $('.choice-multi-gift').show();
        $('.choice-single-gift').hide();
      } else {
        $('.choice-multi-gift').hide();
        $('.choice-single-gift').show();
      }
    }, 1500);
}