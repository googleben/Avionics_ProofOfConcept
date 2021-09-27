import * as THREE from "three";
import { LineDashedMaterial, TetrahedronGeometry } from "three";
const canvas = <HTMLCanvasElement> document.getElementById("mainCanvas");
let rc = canvas.getContext("2d")!;

const threeVars = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(90, 16/9, 0.1, 100000),
    renderer: new THREE.WebGLRenderer(),
    cube: new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({color: 0xff0000}))
};
threeVars.renderer.setSize(1920, 1080);
//threeVars.renderer.setClearColor(new THREE.Color(255, 255, 255));
threeVars.camera.position.z = 5;
threeVars.scene.add(threeVars.cube);
threeVars.scene.background = new THREE.Color(0, 0.3, .75);

//threeVars.renderer.domElement.

const width = canvas.width;
const height = canvas.height;
const planeSvg = "M578.88,516.55,554.154,792.4,703.09,872v78.97L536.974,901.65S528.392,928.3,512,928.3c-14.653,0-24.975-26.65-24.975-26.65L320.91,950.97V872l148.946-79.6L445.12,516.55,33.43,648.05v-78.2L442.15,340.31V185.82c0-80.37,31.27-145.53,69.85-145.53s69.85,65.16,69.85,145.53V340.31L990.57,569.85v78.2Z";
const background = new Image();
background.src = "./background.png";



let prevTimestamp: DOMHighResTimeStamp | null = null;

let data = {
    autopilot: {
        heading: 45,
        speed: 175,
        altitude: 2000,
        verticalSpeed: 100
    },
    heading: 35,
    dheading: 0.1,
    speed: 165,
    accel: 5,
    verticalSpeed: -212,
    verticalAccel: -5,
    altitude: 360,
    pitch: 0,
    roll: 0
};

const UISettings = {
    spedometerPos: [280, 180],
    vertSpedometerPos: [width-280, 180],
    compassPos: [960, 920]
};

function normalizeAngle(angle: number): number {
    while (angle < 0) angle += Math.PI * 2;
    while (angle > Math.PI * 2) angle -= Math.PI * 2;
    return angle;
}

function degToRad(angle: number): number {
    return angle / 180 * Math.PI;
}
function radToDeg(angle: number): number {
    return angle * 180 / Math.PI;
}
class CanvasValues {
    strokeStyle: string | CanvasGradient | CanvasPattern;
    fillStyle: string | CanvasGradient | CanvasPattern;
    lineWidth: number;
    lineCap: CanvasLineCap;
    lineDashOffset: number;
    lineJoin: CanvasLineJoin;
    lineDash: number[];
    font: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    constructor(rc: CanvasRenderingContext2D) {
        this.strokeStyle = rc.strokeStyle;
        this.fillStyle = rc.fillStyle;
        this.lineWidth = rc.lineWidth;
        this.lineCap = rc.lineCap;
        this.lineDashOffset = rc.lineDashOffset;
        this.lineJoin = rc.lineJoin;
        this.lineDash = rc.getLineDash();
        this.font = rc.font;
        this.textAlign = rc.textAlign;
        this.textBaseline = rc.textBaseline;
    }
    load(rc: CanvasRenderingContext2D) {
        rc.strokeStyle = this.strokeStyle;
        rc.fillStyle = this.fillStyle;
        rc.lineWidth = this.lineWidth;
        rc.lineCap = this.lineCap;
        rc.lineDashOffset = this.lineDashOffset;
        rc.lineJoin = this.lineJoin;
        rc.setLineDash(this.lineDash);
        rc.font = this.font;
        rc.textAlign = this.textAlign;
        rc.textBaseline = this.textBaseline;
    }
}

class AnalogGuage {
    r: number;
    bigTickSize: number;
    smallTickSize: number;
    tickStartAngle: number;
    tickEndAngle: number;
    tickDTheta: number;
    smallTicksBetweenBigTicks: number;
    labels: string[] = [];
    labelAngles: number[] = [];
    labelTextRotates: boolean = false;
    labelTextSize: string = "50px";
    drawCenterDot: boolean = true;
    constructor(r: number = 100, bigTickSize: number = 25, smallTickSize: number = 15, tickStartAngle: number = 0, tickEndAngle: number = Math.PI * 2, tickDTheta: number = Math.PI / 8, smallTicksBetweenBigTicks: number = 1) {
        tickStartAngle = normalizeAngle(tickStartAngle);
        tickEndAngle = normalizeAngle(tickEndAngle);
        this.r = r;
        this.bigTickSize = bigTickSize;
        this.smallTickSize = smallTickSize;
        this.tickStartAngle = tickStartAngle;
        this.tickEndAngle = tickEndAngle;
        this.tickDTheta = tickDTheta;
        this.smallTicksBetweenBigTicks = smallTicksBetweenBigTicks;
    }
    ticksByAnglesAndCount(startAngle: number, endAngle: number, count: number) {
        startAngle = normalizeAngle(startAngle);
        endAngle = normalizeAngle(endAngle);
        this.tickStartAngle = startAngle;
        this.tickEndAngle = endAngle;
        this.tickDTheta = (endAngle > startAngle ? (endAngle - startAngle) : (endAngle + Math.PI * 2 - startAngle)) / count;
        console.log(this.tickDTheta);
    }
    labelBigTicksEvenly(startLabel: number, endLabel: number) {
        this.labels = [];
        this.labelAngles = [];
        let bigCount = 0;
        let end = this.tickEndAngle > this.tickStartAngle ? this.tickEndAngle : this.tickEndAngle + Math.PI * 2;
        let ticks = Math.floor((end - this.tickStartAngle) / this.tickDTheta);
        let bigTicks = Math.floor(ticks / (this.smallTicksBetweenBigTicks + 1) + 1);
        let dlabel = (endLabel - startLabel) / (bigTicks - 1);
        let l = startLabel;
        for (let theta = this.tickStartAngle; theta <= end; theta += this.tickDTheta) {
            if (bigCount % (this.smallTicksBetweenBigTicks + 1) == 0) {
                this.labels.push(l.toString());
                this.labelAngles.push(theta);
                l += dlabel;
            }
            bigCount++;
        }
    }
    draw(rc: CanvasRenderingContext2D, x: number, y: number, rotation: number) {
        let innerPath = new Path2D();
        rc.beginPath();
        rc.ellipse(x, y, this.r, this.r, 0, 0, Math.PI * 2);
        innerPath.ellipse(x, y, this.r, this.r, 0, 0, Math.PI * 2);
        let bigCount = 0;
        let bigR = this.r - this.bigTickSize;
        let smallR = this.r - this.smallTickSize;
        let end = this.tickEndAngle > this.tickStartAngle ? this.tickEndAngle : this.tickEndAngle + Math.PI * 2;
        for (let theta = this.tickStartAngle; theta < end; theta += this.tickDTheta) {
            let cos = Math.cos(theta - rotation);
            let sin = Math.sin(theta - rotation);
            rc.moveTo(x + this.r * cos, y + this.r * sin);
            innerPath.moveTo(x + this.r * cos, y + this.r * sin);
            let r2 = bigCount % (this.smallTicksBetweenBigTicks + 1) == 0 ? bigR : smallR;
            rc.lineTo(x + r2 * cos, y + r2 * sin);
            innerPath.lineTo(x + (r2 + 3) * cos, y + (r2 + 3) * sin);
            bigCount++;
        }
        rc.stroke();
        let tmpw = rc.lineWidth;
        let tmps = rc.strokeStyle;
        rc.lineWidth = 0.3;
        rc.strokeStyle = "white";
        rc.stroke(innerPath);
        rc.lineWidth = tmpw;
        rc.strokeStyle = tmps;
        rc.closePath();
        if (this.drawCenterDot) {
            rc.beginPath();
            rc.ellipse(x, y, 7, 7, 0, 0, Math.PI * 2);
            rc.fill();
            rc.closePath();
        }
        rc.font = this.labelTextSize + " Ubuntu Mono";
        rc.textBaseline = "middle";
        rc.textAlign = "center";
        let tmp = rc.lineWidth;
        let tmp2 = rc.strokeStyle;
        let tmp3 = rc.fillStyle;
        rc.lineWidth = 2;
        rc.strokeStyle = "Black";
        rc.fillStyle = "Yellow";
        if (this.labelTextRotates) {
            for (let i = 0; i < this.labels.length; i++) {
                let l = this.labels[i];
                let m = rc.measureText(l);
                let theta = this.labelAngles[i];
                let cos = Math.cos(theta - rotation);
                let sin = Math.sin(theta - rotation);
                let gvextorx = x + cos * (this.r + 10 + m.actualBoundingBoxAscent/1.5);
                let gvectory = y + sin * (this.r + 10 + m.actualBoundingBoxAscent/1.5);
                rc.save();
                rc.translate(gvextorx, gvectory);
                rc.rotate(Math.PI / 2);
                rc.rotate(theta - rotation);
                rc.fillText(l, 0, 0);
                rc.strokeText(l, 0, 0);
                rc.restore();
            }
        } else {
            for (let i = 0; i < this.labels.length; i++) {
                let l = this.labels[i];
                let theta = this.labelAngles[i];
                let cos = Math.cos(theta - rotation);
                let sin = Math.sin(theta - rotation);
                let m = rc.measureText(l);
                let w = (m.actualBoundingBoxRight - m.actualBoundingBoxLeft);
                let gvextorx = x + cos * (this.r + 10);
                let gvectory = y + sin * (this.r + 10);
                let tvectorx = cos * m.width/2 + cos * Math.abs(sin) * m.width/3;
                let tvectory = sin*m.actualBoundingBoxAscent - sin * Math.abs(cos) * m.actualBoundingBoxAscent/2;
                // let tvectorx = Math.abs(cos) > 0.01 ? Math.sign(cos) * m.width/2 - Math.sign(cos) * Math.abs(sin) * m.width/4 : 0;
                // let tvectory = Math.abs(sin) > 0.01 ? Math.sign(sin) * m.actualBoundingBoxAscent : 0;
                rc.fillText(l, gvextorx + tvectorx, gvectory + tvectory);
                rc.strokeText(l, gvextorx + tvectorx, gvectory + tvectory);
            }
        }
        rc.lineWidth = tmp;
        rc.strokeStyle = tmp2;
        rc.fillStyle = tmp3;
    }
    drawNeedle(rc: CanvasRenderingContext2D, x: number, y: number, angle: number, width: number = 5, rFraction: number = 2/3) {
        rc.beginPath();
        rc.moveTo(x, y);
        rc.lineTo(x + Math.cos(angle) * this.r * rFraction, y + Math.sin(angle) * this.r * rFraction);
        let tmp = rc.lineWidth;
        rc.lineWidth = width;
        rc.closePath();
        rc.stroke();
        rc.lineWidth = tmp;
    }
    drawNeedleFromValue(rc: CanvasRenderingContext2D, x: number, y: number, value: number, startValue: number, endValue: number, width: number = 5, rFraction: number = 2/3) {
        let range = endValue - startValue;
        let mult = (value - startValue) / range;
        let end = this.tickEndAngle > this.tickStartAngle ? this.tickEndAngle : this.tickEndAngle + Math.PI * 2;
        let lerp = this.tickStartAngle + mult * (end - this.tickStartAngle);
        this.drawNeedle(rc, x, y, lerp, width, rFraction);
    }
    drawLabelText(rc: CanvasRenderingContext2D, x: number, y: number, value: number, maxDigits: number, canBeNegative: boolean, padChar: string = "0") {
        maxDigits = Math.max(maxDigits, Math.abs(value).toString().length);
        const goalHeight = this.r / 3;
        let sign = value < 0 ? "-" : canBeNegative ? " " : "";
        let text = Math.abs(value).toString();
        while (text.length < maxDigits) text = padChar + text;
        text = sign + text;
        rc.save();
        rc.miterLimit = 0;
        rc.font = "50px Ubuntu Mono";
        rc.textBaseline = "middle";
        rc.textAlign = "center";
        let m1 = rc.measureText(text);
        let m1h = m1.fontBoundingBoxAscent + m1.fontBoundingBoxDescent;
        // rc.fillStyle = "#000000aa";
        // rc.fillRect(x - m1.width/2 - 5, y + this.r / 10 * 4 - m1.actualBoundingBoxAscent - 5, m1.width + 10, m1.actualBoundingBoxAscent*2 + 10);
        // rc.lineWidth = 4;
        // rc.strokeRect(x - m1.width/2 - 5, y + this.r / 10 * 4 - m1.actualBoundingBoxAscent - 5, m1.width + 10, m1.actualBoundingBoxAscent*2 + 10);
        rc.font = "400px Ubuntu Mono";
        rc.lineJoin = "round";
        rc.beginPath();
        let m2 = rc.measureText(text);
        let m2h = m2.fontBoundingBoxAscent + m2.fontBoundingBoxDescent;
        rc.translate(x, y + this.r / 10 * 4);
        rc.scale(goalHeight / m2h, goalHeight / m2h);

        rc.fillStyle = "#000000aa";
        rc.fillRect(-m2.width / 2 - 40, -m2h / 2 - 40, m2.width + 80, m2h + 80);
        rc.lineWidth = 4 / (goalHeight / m2h);
        rc.strokeRect(-m2.width / 2 - 40, -m2h / 2 - 40, m2.width + 80, m2h + 80);
        
        rc.fillStyle = "white";
        rc.lineWidth = 30;
        rc.lineWidth = 50;
        rc.strokeText(text, 0, 0);
        rc.fillText(text, 0, 0);
        
        rc.closePath();
        rc.restore();
    }
    drawOuterSpeedLine(rc: CanvasRenderingContext2D, x: number, y: number, currAngle: number, futureAngle: number, close = 6, far = 30) {
        if (futureAngle < currAngle) {
            let tmp = currAngle;
            currAngle = futureAngle;
            futureAngle = tmp;
        }
        rc.save();
        rc.translate(x, y);
        rc.strokeStyle = "#fc03f8";
        rc.lineWidth = 3;
        let cos = Math.cos(currAngle);
        let sin = Math.sin(currAngle);
        rc.beginPath();
        rc.moveTo(cos * (this.r + close), sin * (this.r + close));
        rc.lineTo(cos * (this.r + far), sin * (this.r + far));
        rc.ellipse(0, 0, this.r + far, this.r + far, 0, currAngle, futureAngle);
        cos = Math.cos(futureAngle);
        sin = Math.sin(futureAngle);
        rc.lineTo(cos * (this.r + close), sin * (this.r + close));
        rc.stroke();
        rc.closePath();
        rc.restore();
    }
    drawOuterSpeedLineFromValue(rc: CanvasRenderingContext2D, x: number, y: number, curr: number, future: number,  startValue: number, endValue: number, close = 6, far = 30) {
        let range = endValue - startValue;
        let mult = (curr - startValue) / range;
        let end = this.tickEndAngle > this.tickStartAngle ? this.tickEndAngle : this.tickEndAngle + Math.PI * 2;
        let currAngle = this.tickStartAngle + mult * (end - this.tickStartAngle);
        mult = (future - startValue) / range;
        let futureAngle = this.tickStartAngle + mult * (end - this.tickStartAngle);
        this.drawOuterSpeedLine(rc, x, y, currAngle, futureAngle, close, far);
    }
}

class DigitalGuage {
    w: number;
    h: number;
    bigTickSize: number;
    smallTickSize: number;
    smallTicksBetweenBigTicks: number;
    tickSpacingPixels: number;
    tickDeltaValue: number;
    numberWheelDelta: number;
    minValue: number | null;
    maxValue: number | null;
    maxDigits: number;
    canBeNegative: boolean;
    constructor(w: number = 200, h: number = 450, bigTickSize: number = 25, smallTickSize: number = 10,
        smallTicksBetweenBigTicks: number = 4, tickSpacingPixels: number = 10, tickDeltaValue: number = 20, numberWheelDelta: number = 20,
        minValue: number | null = null, maxValue: number | null = null, maxDigits: number = 5, canBeNegative: boolean = true) {
        this.w = w;
        this.h = h;
        this.bigTickSize = bigTickSize;
        this.smallTickSize = smallTickSize;
        this.smallTicksBetweenBigTicks = smallTicksBetweenBigTicks;
        this.tickSpacingPixels = tickSpacingPixels;
        this.tickDeltaValue = tickDeltaValue;
        this.numberWheelDelta = numberWheelDelta;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.maxDigits = maxDigits;
        this.canBeNegative = canBeNegative;
    }
    draw(rc: CanvasRenderingContext2D, x: number, y: number, value: number, apValue: number | null, tickSide: "left" | "right") {
        rc.save();
        let saved = new CanvasValues(rc);
        const w = this.w;
        const h = this.h;
        rc.translate(x - this.w / 2, y - this.h / 2);

        rc.fillStyle = "#000000cc";
        rc.fillRect(-w/2, -h/2, w, h);
        rc.fillStyle = "#ffffff";
        rc.strokeStyle = "#ffffff";
        rc.lineWidth = 2;
        rc.font = "20pt Ubuntu Mono";
        rc.textAlign = tickSide;
        rc.textBaseline = "middle";
        rc.beginPath();
        rc.rect(-w/2, -h/2, w, h);
        rc.stroke();
        rc.clip();
        
        
        const deltaOverWindow = this.tickDeltaValue * ((this.h - rc.lineWidth) / this.tickSpacingPixels);
        const windowStart = value - deltaOverWindow / 2;
        const modVal = windowStart >= 0 ? windowStart % this.tickDeltaValue : this.tickDeltaValue+(windowStart % this.tickDeltaValue);
        const firstTickVal = windowStart + (this.tickDeltaValue - modVal) - this.tickDeltaValue;
        const bigTicksEvery = this.tickDeltaValue * (this.smallTicksBetweenBigTicks + 1);
        let pos = (this.h / 2) - rc.lineWidth / 2 - (firstTickVal - windowStart) / this.tickDeltaValue * this.tickSpacingPixels;
        let val = firstTickVal;
        let tickStartX = tickSide == "left" ? -this.w / 2 : this.w / 2;
        while (pos >= (-this.h / 2) - 20) {
            rc.moveTo(tickStartX, pos);
            
            if (Math.abs(val % bigTicksEvery) < this.tickDeltaValue / 2) {
                let end = tickStartX + (tickSide == "left" ? this.bigTickSize : -this.bigTickSize);
                let m = rc.measureText(val.toString());
                //if (pos + m.actualBoundingBoxDescent < this.h / 2 && pos - m.actualBoundingBoxAscent > -this.h / 2) {
                    rc.fillText(val.toString(), end + (tickSide == "left" ? 10 : -10), pos);
                //}
                rc.lineTo(end, pos);
            } else {
                let end = tickStartX + (tickSide == "left" ? this.smallTickSize : -this.smallTickSize);
                rc.lineTo(end, pos);
            }
            pos -= this.tickSpacingPixels;
            val += this.tickDeltaValue;
        }
        rc.stroke();
        
        rc.font = "40px Ubuntu Mono";
        rc.textAlign = "left";
        rc.textBaseline = "middle";
        let deltaNumChars = (this.numberWheelDelta).toString().length;
        let aValue = Math.abs(value);
        let dist = Math.round(aValue) % this.numberWheelDelta;
        let belowVal = Math.round(aValue) - dist;

        let percentOffset = dist / this.numberWheelDelta;

        let belowLabel = (belowVal).toString();
        let aboveLabel = (belowVal + this.numberWheelDelta).toString();
        while (belowLabel.length < aboveLabel.length) {
            belowLabel = "0" + belowLabel;
        }
        while (aboveLabel.length < belowLabel.length) {
            aboveLabel = "0" + aboveLabel;
        }
        let notChangingLabel = "";
        let changeIndex = -1;
        for (let i = 0; i < belowLabel.length; i++) {
            if (belowLabel[i] != aboveLabel[i]) {
                changeIndex = i;
                break;
            }
            notChangingLabel += belowLabel[i];
        }
        belowLabel = belowLabel.substring(changeIndex);
        aboveLabel = aboveLabel.substring(changeIndex);
        let belowBelowLabel = (belowVal - this.numberWheelDelta).toString();
        belowBelowLabel = belowBelowLabel.substring(belowBelowLabel.length - deltaNumChars);
        let aboveAboveLabel = (belowVal + this.numberWheelDelta + this.numberWheelDelta).toString();
        aboveAboveLabel = aboveAboveLabel.substring(aboveAboveLabel.length - deltaNumChars);
        if (value < 0) {
            let tmp = belowBelowLabel;
            belowBelowLabel = aboveAboveLabel;
            aboveAboveLabel = tmp;
            tmp = aboveLabel;
            aboveLabel = belowLabel;
            belowLabel = tmp;
        }

        while (notChangingLabel.length < this.maxDigits - belowLabel.length) notChangingLabel = "0" + notChangingLabel;
        if (value < 0) notChangingLabel = "-" + notChangingLabel;
        else if (this.canBeNegative) notChangingLabel = " " + notChangingLabel;
        let tmpLabel = notChangingLabel;
        for (let i = 0; i < belowLabel.length - deltaNumChars; i++) tmpLabel+= "0";
        
        let mNoExpandedBox = rc.measureText(tmpLabel);
        let mNoChange = rc.measureText(notChangingLabel);
        let mChange = rc.measureText(belowBelowLabel);
        let charMeasure = rc.measureText("00");
        const spaceBetweenChars = (charMeasure.width - rc.measureText("0").width * 2) / (1); 
        const charHeight = mChange.fontBoundingBoxAscent + mChange.fontBoundingBoxDescent;
        let startXTmp = -w / 2 + this.smallTickSize;
        if (tickSide == "right") {
            startXTmp = w / 2 - this.smallTickSize - 40 - mNoExpandedBox.width - spaceBetweenChars - 2 - mChange.width;
        }
        const startX = startXTmp;
        rc.beginPath()
        rc.moveTo(startX + 20, mNoExpandedBox.fontBoundingBoxDescent);
        if (tickSide == "left") {
            rc.lineTo(startX + 20, 10);
            rc.lineTo(startX, 0);
            rc.lineTo(startX + 20, -10);
        }
        rc.lineTo(startX + 20, -mNoExpandedBox.fontBoundingBoxAscent);
        rc.lineTo(startX + 20 + mNoExpandedBox.width + spaceBetweenChars - 2, -mNoExpandedBox.fontBoundingBoxAscent);
        rc.lineTo(startX + 20 + mNoExpandedBox.width + spaceBetweenChars - 2, -mNoExpandedBox.fontBoundingBoxAscent * 2);
        rc.lineTo(startX + 20 + mNoExpandedBox.width + spaceBetweenChars - 2 + mChange.width + 4, -mNoExpandedBox.fontBoundingBoxAscent * 2);
        if (tickSide == "right") {
            rc.lineTo(startX + 20 + mNoExpandedBox.width + spaceBetweenChars - 2 + mChange.width + 4, -10);
            rc.lineTo(w / 2 - this.smallTickSize, 0);
            rc.lineTo(startX + 20 + mNoExpandedBox.width + spaceBetweenChars - 2 + mChange.width + 4, 10);
        }
        rc.lineTo(startX + 20 + mNoExpandedBox.width + spaceBetweenChars - 2 + mChange.width + 4, mNoExpandedBox.fontBoundingBoxDescent * 2);
        rc.lineTo(startX + 20 + mNoExpandedBox.width + spaceBetweenChars - 2, mNoExpandedBox.fontBoundingBoxDescent * 2);
        rc.lineTo(startX + 20 + mNoExpandedBox.width + spaceBetweenChars - 2, mNoExpandedBox.fontBoundingBoxDescent);
        rc.lineTo(startX + 20, mNoExpandedBox.fontBoundingBoxDescent);

        rc.fillStyle = "#222222";
        rc.fill();
        rc.stroke();
        rc.clip();
        rc.fillStyle = "#ffffff";
        if (value < 0) {
            percentOffset = 1 - percentOffset;
        }
        rc.fillText(notChangingLabel, startX + 20, 0);
        rc.fillText(aboveAboveLabel, startX + 20 + mNoExpandedBox.width + spaceBetweenChars, -(2-percentOffset) * charHeight);
        rc.fillText(aboveLabel, startX + 20 + mNoChange.width + spaceBetweenChars, -(1-percentOffset) * charHeight);
        rc.fillText(belowLabel, startX + 20 + mNoChange.width + spaceBetweenChars, percentOffset * charHeight);
        rc.fillText(belowBelowLabel, startX + 20 + mNoExpandedBox.width + spaceBetweenChars, (1 + percentOffset) * charHeight);
        let grad = rc.createLinearGradient(0, -mNoExpandedBox.fontBoundingBoxAscent * 2, 0, mNoExpandedBox.fontBoundingBoxAscent * 2);
        grad.addColorStop(0, "#000000ff");
        grad.addColorStop(0.45, "#00000033");
        grad.addColorStop(0.5, "#00000011");
        grad.addColorStop(0.55, "#00000033");
        grad.addColorStop(1, "#000000ff");
        rc.fillStyle = grad;
        rc.fill();
        rc.stroke();
        rc.restore();
        saved.load(rc);
    }
}

class ArtificialHorizon {
    
    //dAngle after this line (radians), width (% of full width), labeled
    linePattern: [number, number, boolean][];
    cornerSize: number = 0.1;
    constructor(linePattern: [number, number, boolean][] = [[degToRad(2.5), 4/7, true], [degToRad(2.5), 66/350, false], [degToRad(2.5), 132/350, false], [degToRad(2.5), 66/350, false]]) {
        this.linePattern = linePattern;
    }
    draw(rc: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, pixelsPerRadian: number, pitch: number, roll: number) {
        rc.save();
        let tmpFont = rc.font;
        rc.font = "20pt Ubuntu Mono";
        let tmpTextAlign = rc.textAlign;
        rc.textAlign = "left";
        let tmpTextBaseline = rc.textBaseline;
        rc.textBaseline = "middle";
        rc.translate(x, y);
        //rc.scale(w, h);
        rc.rotate(roll);
        rc.beginPath();

        rc.lineWidth = 6;
        rc.strokeStyle = "#00ff00";

        rc.moveTo(-w/2, -h/2+this.cornerSize*w);
        rc.lineTo(-w/2, -h/2);
        rc.lineTo(-w/2+this.cornerSize*w, -h/2);
        rc.moveTo(w/2-this.cornerSize*w, -h/2);
        rc.lineTo(w/2, -h/2);
        rc.lineTo(w/2, -h/2+this.cornerSize*w);
        rc.moveTo(w/2, h/2-this.cornerSize*w);
        rc.lineTo(w/2, h/2);
        rc.lineTo(w/2-this.cornerSize*w, h/2);
        rc.moveTo(-w/2+this.cornerSize*w, h/2);
        rc.lineTo(-w/2, h/2);
        rc.lineTo(-w/2, h/2-this.cornerSize*w);

        let patternIndex = 0;
        let angle = 0;
        let radsPerPattern = 0;
        for (let i of this.linePattern) {
            radsPerPattern += i[0];
        } 
        let patternNum = Math.floor(pitch / radsPerPattern);
        angle = patternNum * radsPerPattern;
        let addedAny = false;
        while (angle <= pitch) {
            angle += this.linePattern[patternIndex][0];
            patternIndex++;
            addedAny = true;
        }
        //if (addedAny) patternIndex--;
        while (angle > pitch) {
            patternIndex--;
            angle -= this.linePattern[patternIndex][0];
        }
        let justBelowPatternIndex = patternIndex;
        let justBelowAngle = angle;
        let pos = (pitch - angle) * pixelsPerRadian;
        while (pos < h / 2 - this.cornerSize * h * 1.5) {
            rc.moveTo(-this.linePattern[patternIndex][1] * w / 2, pos);
            rc.lineTo(this.linePattern[patternIndex][1] * w / 2, pos);
            if (this.linePattern[patternIndex][2]) {
                let labelN = radToDeg(angle).toFixed(1);
                let label = labelN.endsWith(".0") ? labelN.substr(0, labelN.length - 2) : labelN;
                if (label == "-0") label = "0";
                let m = rc.measureText(label);
                rc.lineWidth = 5;
                rc.strokeStyle = "black";
                rc.strokeText(label, -this.linePattern[patternIndex][1] * w / 2 - m.width - 10, pos);
                rc.strokeText(label, this.linePattern[patternIndex][1] * w / 2 + 10, pos);
                rc.fillStyle = "#00ff00";
                rc.fillText(label, -this.linePattern[patternIndex][1] * w / 2 - m.width - 10, pos);
                rc.fillText(label, this.linePattern[patternIndex][1] * w / 2 + 10, pos);
                rc.strokeStyle = "#00ff00";
                rc.lineWidth = 6;
            }
            patternIndex--;
            if (patternIndex < 0) patternIndex = this.linePattern.length - 1;
            let dAngle = this.linePattern[patternIndex][0];
            angle -= dAngle;
            pos += dAngle * pixelsPerRadian;
            if (angle < degToRad(-90)) {
                break;
            }
        }
        patternIndex = justBelowPatternIndex + 1;
        angle = justBelowAngle + (this.linePattern[patternIndex - 1][0]);
        if (patternIndex == this.linePattern.length) patternIndex = 0;
        pos = (pitch - angle) * pixelsPerRadian;
        while (pos > -h / 2 + this.cornerSize * h * 1.5) {
            rc.moveTo(-this.linePattern[patternIndex][1] * w / 2, pos);
            rc.lineTo(this.linePattern[patternIndex][1] * w / 2, pos);
            if (this.linePattern[patternIndex][2]) {
                let labelN = radToDeg(angle).toFixed(1);
                let label = labelN.endsWith(".0") ? labelN.substr(0, labelN.length - 2) : labelN;
                if (label == "-0") label = "0";
                let m = rc.measureText(label);
                rc.lineWidth = 5;
                rc.strokeStyle = "black";
                rc.strokeText(label, -this.linePattern[patternIndex][1] * w / 2 - m.width - 10, pos);
                rc.strokeText(label, this.linePattern[patternIndex][1] * w / 2 + 10, pos);
                rc.fillStyle = "#00ff00";
                rc.fillText(label, -this.linePattern[patternIndex][1] * w / 2 - m.width - 10, pos);
                rc.fillText(label, this.linePattern[patternIndex][1] * w / 2 + 10, pos);
                rc.strokeStyle = "#00ff00";
                rc.lineWidth = 6;
            }
            let dAngle = (this.linePattern[patternIndex][0]);
            angle += dAngle;
            if (angle > degToRad(90)) {
                break;
            }
            
            pos -= dAngle * pixelsPerRadian;
            patternIndex++;
            if (patternIndex >= this.linePattern.length) patternIndex = 0;
        }



        rc.stroke();

        rc.restore();
        rc.font = tmpFont;
        rc.textAlign = tmpTextAlign;
        rc.textBaseline = tmpTextBaseline;
    }
}

const horizon = new ArtificialHorizon();

const spedometer = new AnalogGuage(110, 25, 15, Math.PI * 0.75, Math.PI * 0.251, Math.PI / 8, 1);
spedometer.labelBigTicksEvenly(0, 300);

const vertSpedometer = new AnalogGuage(110, 25, 15, Math.PI * 0.75, Math.PI * 0.251, Math.PI / 8, 1);
vertSpedometer.labelBigTicksEvenly(-300, 300);

const altimeter = new DigitalGuage();
const digitalSpedometer = new DigitalGuage(200, 450, 25, 10, 1, 50, 5, 1, 0, 999, 3, false);

//984, 941
const compass = new AnalogGuage(110, 25, 15, 0, Math.PI * 2 - 0.01, Math.PI / 36, 5);
//compass.labelBigTicksEvenly(0, 360);
compass.labels = ["N", "3", "6", "E", "12", "15", "S", "21", "24", "W", "30", "33"];
compass.labelAngles = [0, Math.PI / 6, Math.PI / 3, Math.PI / 2, 2 * Math.PI / 3, 5 * Math.PI / 6, Math.PI, 7 * Math.PI / 6, 4 * Math.PI / 3, 3 * Math.PI / 2, 5 * Math.PI / 3, 11 * Math.PI / 6];
compass.labelAngles = compass.labelAngles.map(a => normalizeAngle(a + 3 * Math.PI / 2));
compass.labelTextRotates = true;
compass.labelTextSize = "40px";
compass.drawCenterDot = false;
rc.lineWidth = 6;
let pitchDir = 1;
async function renderLoop(timestamp: DOMHighResTimeStamp) {
    if (prevTimestamp == null) prevTimestamp = timestamp;
    let dt = timestamp-prevTimestamp;
    prevTimestamp = timestamp;

    threeVars.cube.rotateX(dt * Math.PI/20000);

    threeVars.renderer.render(threeVars.scene, threeVars.camera);


    //rc.clearRect(0, 0, width, height);
    //rc.drawImage(background, 0, 0, width, height);
    let threeOut = threeVars.renderer.domElement.toDataURL();
    let threeImg = new Image();
    let imgPromise = new Promise((res, _) => {
        threeImg.onload = () => {
            res("");
        };
        threeImg.src = threeOut;
    });
    let _ = await imgPromise;
    rc.drawImage(threeImg, 0, 0);
    data.altitude += (dt / 10);
    data.pitch += (dt / 100000 * 40) * pitchDir;
    if (radToDeg(data.pitch) > 90) {
        pitchDir = -1;
        data.pitch -= dt / 100000 * 40 * 2;
    }
    if (data.pitch < degToRad(-90)) {
        pitchDir = 1;
        data.pitch += dt / 100000 * 40 * 2;
    }
    //data.roll += (dt / 100000 * 40);
    //data.pitch = degToRad(9);
    horizon.draw(rc, width/2, height/2, 350, 420, 65/degToRad(10), data.pitch, data.roll);
    rc.save();
    rc.beginPath();
    let tmp = rc.strokeStyle;
    let tmp2 = rc.lineWidth;
    rc.strokeStyle = "yellow";
    rc.lineWidth = 6;
    rc.moveTo(1920/2 - 30*Math.cos(Math.PI / 3.5)*2, 1080/2);
    rc.lineTo(1920/2 - 30*Math.cos(Math.PI / 3.5), 1080/2+30*Math.sin(Math.PI / 3.5));
    rc.lineTo(1920/2, 1080/2);
    rc.lineTo(1920/2 + 30*Math.cos(Math.PI / 3.5), 1080/2+30*Math.sin(Math.PI / 3.5));
    rc.lineTo(1920/2 + 30*Math.cos(Math.PI / 3.5)*2, 1080/2);
    rc.stroke();
    rc.strokeStyle = tmp;
    rc.lineWidth = tmp2;
    rc.restore();

    altimeter.draw(rc, 1920 - 100 - altimeter.w / 2, 1080 - 100 - altimeter.h / 2, data.altitude, null, "left");
    digitalSpedometer.draw(rc, 100 + digitalSpedometer.w, 1080 - 100 - digitalSpedometer.h / 2, data.speed, null, "right");
    //altimeter.draw(rc, 1920 - 100 - altimeter.w / 2 * 3, 1080 - 100 - altimeter.h / 2, data.altitude, null, "right");
    spedometer.drawOuterSpeedLineFromValue(rc, UISettings.spedometerPos[0], UISettings.spedometerPos[1], data.speed, data.speed + data.accel * 10, 0, 300);
    spedometer.draw(rc, UISettings.spedometerPos[0], UISettings.spedometerPos[1], 0);
    spedometer.drawNeedleFromValue(rc, UISettings.spedometerPos[0], UISettings.spedometerPos[1], data.speed, 0, 300);
    spedometer.drawLabelText(rc, UISettings.spedometerPos[0], UISettings.spedometerPos[1], data.speed, 3, false);
    vertSpedometer.drawOuterSpeedLineFromValue(rc, UISettings.vertSpedometerPos[0], UISettings.vertSpedometerPos[1], data.verticalSpeed, data.verticalSpeed + data.verticalAccel * 10, -300, 300);
    vertSpedometer.draw(rc, UISettings.vertSpedometerPos[0], UISettings.vertSpedometerPos[1], 0);
    vertSpedometer.drawNeedleFromValue(rc, UISettings.vertSpedometerPos[0], UISettings.vertSpedometerPos[1], data.verticalSpeed, -300, 300);
    vertSpedometer.drawLabelText(rc, UISettings.vertSpedometerPos[0], UISettings.vertSpedometerPos[1], data.verticalSpeed, 4, true);

    rc.save();
    rc.beginPath();
    rc.setLineDash([9, 1]);
    rc.lineDashOffset = 2;
    rc.moveTo(UISettings.compassPos[0], UISettings.compassPos[1]+compass.r);
    rc.lineTo(UISettings.compassPos[0], UISettings.compassPos[1]-compass.r);
    rc.lineWidth = 6;
    rc.strokeStyle = "black";
    rc.stroke();
    rc.lineDashOffset = 0;
    rc.beginPath();
    rc.setLineDash([5, 5]);
    rc.moveTo(UISettings.compassPos[0], UISettings.compassPos[1]+compass.r);
    rc.lineTo(UISettings.compassPos[0], UISettings.compassPos[1]-compass.r);
    rc.lineWidth = 3;
    rc.strokeStyle = "yellow";
    rc.stroke();
    rc.closePath();
    rc.restore();
    compass.drawOuterSpeedLineFromValue(rc, UISettings.compassPos[0], UISettings.compassPos[1], -90, -90 + data.dheading * 10, 0, 360, 6, 20);
    compass.draw(rc, UISettings.compassPos[0], UISettings.compassPos[1], degToRad(data.heading));
    rc.save();
    
    let planeSize = 30;
    //rc.drawImage(planeImg, 984-planeSize/2, 900-planeSize/2, planeSize, planeSize);
    let planePath = new Path2D(planeSvg);
    
    rc.translate(UISettings.compassPos[0]-planeSize/2, UISettings.compassPos[1]-planeSize/2);
    rc.scale(planeSize/1000, planeSize/1000);
    rc.lineWidth = 70;
    rc.fillStyle = "Yellow"
    rc.fill(planePath);
    rc.stroke(planePath);
    rc.restore();
    let compassLabel = data.heading.toString();
    while (compassLabel.length < 3) compassLabel = "0" + compassLabel;
    compass.drawLabelText(rc, UISettings.compassPos[0], UISettings.compassPos[1], data.heading, 3, false);
    
    window.requestAnimationFrame(renderLoop);
}

background.addEventListener("load", () => {
    window.requestAnimationFrame(renderLoop);
});