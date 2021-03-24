/* Math generation library */

window.mathQuestions = [];
function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function getCorrectAnswer(left, right) {
    var currentCorrectAnswer;
    if(window.mathOperation == "add") {
        currentCorrectAnswer = left + right;
    } else if(window.mathOperation == "subtract") {
        currentCorrectAnswer = left - right;
    } else if(window.mathOperation == "multiply") {
        currentCorrectAnswer = left * right;
    } else if(window.mathOperation == "divide") {
        currentCorrectAnswer = left / right;
    }
    return currentCorrectAnswer;
}

window.generateMathQuestions = function(operation, maxResultSize) {
    window.currentMathIndex = 0;
    window.mathOperation = operation;
    var leftMin = 0, leftMax = 0, rightMin = 0, rightMax = 0;
    var isSubtractionLike = false;
    if(operation == "add") {
        window.mathSymbol = "&plus;";
    } else if(operation == "subtract") {
        window.mathSymbol = "&minus;";
        isSubtractionLike = true;
    } else if(operation == "multiply") {
        window.mathSymbol = "&times;";
    } else if(operation == "divide") {
        window.mathSymbol = "&divide;";
        isSubtractionLike = true;
    }
    leftMin = rightMin = 1;
    leftMax = rightMax = (((maxResultSize+1) == 10) ? 9 : 5);
    function isInt(value) {
        return !isNaN(value) && 
               parseInt(Number(value)) == value && 
               !isNaN(parseInt(value, 10));
    }
    for(var left = leftMin; left <= leftMax; left++) {
        for(var right = rightMin; right <= (isSubtractionLike ? left : rightMax); right++) {
            if(isInt(getCorrectAnswer(left, right)))
                window.mathQuestions.push([ left, right ]);
            else {
                console.log("Skipped: " + left + " " + right);
            }
        }
    }
    if(window.mathQuestions.length == 0)
        throw new Error("No " + operation + " questions????");
    console.log(window.mathQuestions.slice());
    shuffle(window.mathQuestions);
}

window.getNextMathQuestion = function() {
    if(window.currentMathIndex <= (window.mathQuestions.length - 1)) {
        var operands = window.mathQuestions[window.currentMathIndex];
        var currentCorrectAnswer = getCorrectAnswer(operands[0], operands[1]);
        window.currentMathIndex++;
        return { operands: operands, currentCorrectAnswer: currentCorrectAnswer };
    } else {
        shuffle(window.mathQuestions);
        window.currentMathIndex = 0;
        return window.getNextMathQuestion();
    }
}