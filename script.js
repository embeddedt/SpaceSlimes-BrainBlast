function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
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

var brainBlastScript = getParameterByName("bbscript");

if(brainBlastScript != null) {
    var script = document.createElement("script");
    var button = document.querySelector("#start-button");
    script.addEventListener("load", function() {
        shuffle(window.questions);
        button.removeAttribute("disabled");
    });
    script.src = brainBlastScript;
    document.head.appendChild(script);
} else {
    window.alert("Please provide bbscript as a URL parameter");
}

window.onchoosefn = function(event) {

    var NUM_COLUMNS = 5;

    var OFFSET_CUTOFF = 0.75;

    var MIN_OFFSET = 0.15;

    var slimeColumnContainer = document.querySelector("#slimes");
    var aimContainer = document.querySelector("#aim-container");
    aimContainer.style.display = "";
    document.querySelector(".game-info").style.display = "";
    document.querySelector("#option-screen").style.display = "none";
    /** @type {HTMLElement} */
    var aimerContainer = document.querySelector("#aimer-container");

    var rocket = document.querySelector(".rocket");

    var aimerColumn = 0;

    var slimeColumns = [];

    var missileFiring = false;

    var missile = document.querySelector(".missile-container");

    var operation = event.currentTarget.textContent.toLowerCase();

    var currentCorrectAnswer;

    var currentQuestionIndex = 0;


    var gameEnded = false;

    var queuedMissile = -1;

    var points = 0;

    var laserSound = new Howl({
        src: ['laser.wav']
    });

    laserSound.load();

    var incorrectSound = new Howl({
        src: ['incorrect.mp3']
    });

    var correctSound = new Howl({
        src: ['correct.wav']
    });

    var rocketSound = new Howl({
        src: ['rockets.wav']
    });


    function getRandomIntInclusive(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
    }

    var prevMove = null;
    function updateColumnsPosition(move) {
        slimeColumns.forEach((column, i) => {
            if(move) {
                var delta = 20;
                if(prevMove != null) {
                    delta = performance.now() - prevMove;
                }
                prevMove = performance.now();
                column.offset = Math.max(MIN_OFFSET, column.offset + ((Math.random() * column.speed) / 1000));
                if(column.offset >= OFFSET_CUTOFF) {
                    newQuestion(-5);
                }
            }
            column.column.style.transform = "translateY(" + (column.offset * 100) + "%)";
        });
    }

    function regenerateColumn(columnIndex, value) {
        slimeColumns[columnIndex].column.querySelector("span").innerHTML = value;
        slimeColumns[columnIndex].offset = 0;
    }

    function factors(number) {
        return Array.from(Array(number + 1), function(_, i) { return i }).filter(function(i) { return number % i === 0 });
    }

    function getIncorrectAnswersForEpicQuestion() {
        /*
         * The following algorithm is really quite inefficient as it checks random questions every single time to find
         * some random incorrect answers. However, it works well enough at this scale and is easy to understand.
         */
        /* It would be preferable to use a Set here, however, that is not supported in IE11 */
        var incorrectAnswers = [];
        do {
            var idx = getRandomIntInclusive(0, window.questions.length - 1);
            if(idx == currentQuestionIndex)
                continue;
            var value = window.questions[idx].question;
            if(incorrectAnswers.indexOf(value) != -1)
                continue;
            incorrectAnswers.push(value);
        } while(incorrectAnswers.length < Math.min(window.questions.length - 1, 4));
        while(incorrectAnswers.length < 4) {
            incorrectAnswers.push("");
        }
        shuffle(incorrectAnswers);
        return incorrectAnswers;
    }

    function newQuestion(pointDelta, specificColumn, shouldAdvance) {
        if(typeof shouldAdvance == 'undefined')
            shouldAdvance = true;
        if(typeof specificColumn != 'undefined') {
            var booster = ((OFFSET_CUTOFF-slimeColumns[specificColumn].offset) / OFFSET_CUTOFF);
            if(booster < 0)
                booster = 1;
            pointDelta = Math.round(pointDelta * booster);
        }
        points += pointDelta;
        document.querySelector(".game-info small").innerHTML = "POINTS: " + (points);
        if(pointDelta < 0) {
            incorrectSound.play();
            if(!shouldAdvance)
                return; /* don't allow advancing to the next question */
        } else if(pointDelta > 0)
            correctSound.play();
        if(points >= 100 || currentQuestionIndex >= window.questions.length) {
            gameEnded = true;
            document.getElementById("win-dialog").style.display = "";
            return;
        }
        var correctInitialColumn = getRandomIntInclusive(0, NUM_COLUMNS - 1);
        var question = window.questions[currentQuestionIndex];
        currentCorrectAnswer = window.questions[currentQuestionIndex].question;
        document.querySelector(".game-info span").innerHTML = question.answers[0];
        var incorrectAnswers = getIncorrectAnswersForEpicQuestion();

        for(var i = 0; i < NUM_COLUMNS; i++) {
            regenerateColumn(i, i == correctInitialColumn ? currentCorrectAnswer : incorrectAnswers.pop());
            slimeColumns[i].isCorrect = i == correctInitialColumn;
        }
        updateColumnsPosition(false);
        currentQuestionIndex++;
    }

    function fireMissile() {
        if(missileFiring)
            return;
        missileFiring = true;
        laserSound.once('play', function() {
            missile.style.display = "block";
            var slimeColumn = slimeColumns[aimerColumn];
            var offset = 0;
            var prevTime = performance.now();
            var missileHandler = function(time) {
                var delta = time - prevTime;
                prevTime = time;
                missile.style.transform = "translateX(-50%) translateY(" + (-offset * 100) + "%)";
                offset += 0.04 * (delta/16);
                if(offset >= ((1-slimeColumn.offset)-0.2)) {
                    missileFiring = false;
                    missile.style.display = "";
                    newQuestion(slimeColumns[aimerColumn].isCorrect ? 5 : -5, aimerColumn, false);
                    return;
                }
                requestAnimationFrame(missileHandler);
            };
            missileHandler(prevTime);
        });
        laserSound.play();
    }
    document.addEventListener("keydown", function(e) {
        if(!missileFiring) {
            if(e.key == "ArrowLeft" || e.key == "Left") {
                aimerColumn--;
                rocketSound.play();
            } else if(e.key == "ArrowRight" || e.key == "Right") {
                aimerColumn++;
                rocketSound.play();
            }
            if(aimerColumn < 0)
                aimerColumn = NUM_COLUMNS - 1;
            else if(aimerColumn > (NUM_COLUMNS-1))
                aimerColumn = 0;
            aimerContainer.style.transform = "translateX(" + (aimerColumn * 100) + "%)";
            if((e.key == "ArrowUp" || e.key == "Up") && queuedMissile == -1) {
                fireMissile();
            }
        }
    });

    rocket.addEventListener("click", fireMissile);

    function onSlimeColumnClick(e) {
        if(queuedMissile != -1)
            return;
        var slimeColumn;
        if(e.currentTarget.classList.contains("slime-img")) {
            slimeColumn = e.currentTarget.parentNode;
            if(queuedMissile != -1)
                clearTimeout(queuedMissile);
        } else
            slimeColumn = e.currentTarget;
        var newColumn = parseInt(slimeColumn.getAttribute("data-column"));
        var moving = aimerColumn != newColumn;
        if(moving) {
            aimerColumn = newColumn;
            aimerContainer.style.transform = "translateX(" + (aimerColumn * 100) + "%)";
            rocketSound.play();
        }

        if(e.currentTarget.classList.contains("slime-img")) {
            queuedMissile = setTimeout(function() {
                fireMissile();
                queuedMissile = -1;
            }, moving ? 500 : 0);
        }
    }

    for(var i = 0; i < NUM_COLUMNS; i++) {
        var slimeColumn = document.createElement("div");
        slimeColumn.classList.add("slime-column");
        slimeColumn.innerHTML = '<div class="slime-img"><img src="splat.svg"/><span>test</span></div>';
        slimeColumn.addEventListener("click", onSlimeColumnClick);
        slimeColumn.querySelector(".slime-img").addEventListener("click", onSlimeColumnClick);
        slimeColumn.setAttribute("data-column", i);
        slimeColumnContainer.appendChild(slimeColumn);
        slimeColumns.push({ offset: 0, speed: (Math.random() / 2) + 0.5 + (0.7*(Math.max(0, points)/100)), column: slimeColumn });
        // ---------
        if(i > 0) {
            slimeColumn = document.createElement("div");
            slimeColumn.classList.add("slime-column");
            aimContainer.appendChild(slimeColumn);
        }
    }
    newQuestion(0);


    setInterval(function() {
        if(document.visibilityState == 'visible' && !gameEnded)
            updateColumnsPosition(true);
    }, 20);
}
