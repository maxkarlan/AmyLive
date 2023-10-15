let images = [null, null, null, null, null, null, null, null];
const transparencyThreshold = 128;
const numOfStreams = 2500;
let imgCenter; 
let pointImageOverlapCache = {};  
let squareSide;
let streamGroups = [];

function preload() {
    squareSide = Math.min(windowWidth, windowHeight);
    let desiredImageHeight = squareSide * 2;

    for (let i = 0; i < 8; i++) {
        loadImage(`images/image${i + 1}.png`, img => {
            let scaleFactor = desiredImageHeight / img.height;
            img.resize(img.width * scaleFactor, img.height * scaleFactor);
            images[i] = img;
        });
    }
}

function windowResized() {
    // Resize the canvas to the new window width and height
    resizeCanvas(windowWidth, windowHeight);
    imgCenter.set(width / 2, height / 2);  // Reset the center as the window has been resized

    // Recompute any parameters that depend on the window size
    squareSide = Math.min(windowWidth, windowHeight);
    let desiredImageHeight = squareSide * 2;
    
    for (let i = 0; i < images.length; i++) {
        let img = images[i];
        if (img) {
            let scaleFactor = desiredImageHeight / img.height;
            img.resize(img.width * scaleFactor, img.height * scaleFactor);
        }
    }
    
    // Update center coordinates
    imgCenter.set(width / 2, height / 2);
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    imgCenter = createVector(width / 2, height / 2);  // Compute center once
    background(135, 206, 235);

    const colors = [
        [255, 219, 172],
        [25, 25, 112],
        [255,215,0],
        [27, 18, 18],
        [27, 18, 18],
        [222, 49, 99],
        [255,215,0],
        [27, 18, 18]
    ];

    const percentages = [0.45, 0.16, .0075, 0.03, .34, 0.02, 0.02, .02];
    streamGroups = [];

    for (let j = 0; j < 8; j++) {
        let streams = [];
        let streamCountForImage = Math.round(numOfStreams * percentages[j]);
        for (let i = 0; i < streamCountForImage; i++) {
            streams.push(new Stream(colors[j], j));
        }
        streamGroups.push(streams);
    }
}

function isOverAnyImageCached(point) {
    let cacheKey = `${point.x},${point.y}`;

    // Use the cached result if available
    if (pointImageOverlapCache.hasOwnProperty(cacheKey)) {
        return pointImageOverlapCache[cacheKey];
    }

    let result = Stream.prototype.isOverAnyImage.call({ isOverImage: Stream.prototype.isOverImage }, point);
    pointImageOverlapCache[cacheKey] = result;  // Cache the result

    return result;
}


function draw() {


background(135, 206, 235);
pointImageOverlapCache = {};  // Clear the cache for each frame
drawTransparentSquare();	

for (let streams of streamGroups) {
for (let s of streams) {
    s.update();
    s.display();
}
}
}

function drawTransparentSquare() {
    // Transparent square style
    fill(255, 0); // White color with 0% transparency
    noStroke();
    // Drawing the square at the center of the canvas
    rectMode(CENTER);
    rect(width / 2, height / 2, squareSide, squareSide);
}

function isInsideSquare(point) {
    let halfSide = squareSide / 2;
    return point.x >= (imgCenter.x - halfSide) && point.x <= (imgCenter.x + halfSide) &&
           point.y >= (imgCenter.y - halfSide) && point.y <= (imgCenter.y + halfSide);
}


function mousePressed() {
for (let streams of streamGroups) {
for (let s of streams) {
    s.changeMode();
}
}
}

class Stream {
    constructor(color, assignedImageIdx) {
        this.color = color;
        this.points = [];
        this.noiseOffset = random(1000);
        this.currentAngle = random(TWO_PI);
        this.attractMode = true; // Set default value to true
        this.assignedImageIdx = assignedImageIdx;
        this.insideImage = false;
        this.initStream();
        this.insideImage = false;
    }
    changeMode() {
        this.attractMode = !this.attractMode;
    }
  
      isOverAnyImage(point) {
                return isOverAnyImageCached(point);  // Use the cached function instead
                }

                initStream() {
                    let startX = random(width);
                    let startY = random(height);
            
                    while (!this.isOverAssignedImage(createVector(startX, startY))) {
                        startX = random(width);
                        startY = random(height);
                    }
            
                    this.points.push(createVector(startX, startY));
                }

    isOutsideAllImages(point) {
        return !this.isOverAnyImage(point);
    }

    isOverAnyImage(point) {
        for (let img of images) {
            if (this.isOverImage(point, img)) return true;
        }
        return false;
    }

    isOverAssignedImage(point) {
        return this.isOverImage(point, images[this.assignedImageIdx]);
    }

    isOverImage(point, img) {
        let imgX = point.x - (width / 2 - img.width / 2);
        let imgY = point.y - (height / 2 - img.height / 2);
        if (imgX >= 0 && imgX < img.width && imgY >= 0 && imgY < img.height) {
            let pixelColor = img.get(imgX, imgY);
            return alpha(pixelColor) > transparencyThreshold && isInsideSquare(point);
        }
        return false;
    }
  
    stayWithinBounds(point) {
        const buffer = 5;  // Small buffer to ensure that the stream doesn't touch the edge
        if (point.x <= buffer || point.x >= width - buffer) {
            this.currentAngle = PI - this.currentAngle;  // Reflect horizontally
        }
        if (point.y <= buffer || point.y >= height - buffer) {
            this.currentAngle = -this.currentAngle;  // Reflect vertically
        }
    }
    

    update() {
        let lastPoint = this.points[this.points.length - 1];
        let newPoint;
    
        let speed = this.attractMode ? 4 : 8; 
    
        if (this.attractMode) {
            if (this.isOutsideAllImages(lastPoint) || this.insideImage) {
                this.currentAngle = this.calculateAngleTowardsImage(lastPoint, this.assignedImageIdx);
            }
        } else {
            // Only change direction if the point is not inside its assigned image
            if (!this.isOverAssignedImage(lastPoint) && this.isOverAnyImage(lastPoint)) {
                this.currentAngle = this.calculateAngleAwayFromClosestImageCenter(lastPoint);
            }
        }
    
        let angleVariation = map(noise(this.noiseOffset), 0, 1, -PI / 2, PI / 2);
        this.currentAngle += angleVariation;
    
        newPoint = p5.Vector.fromAngle(this.currentAngle).mult(speed).add(lastPoint);
    
        if (this.attractMode && this.insideImage && !this.isOverAssignedImage(newPoint)) {
            this.currentAngle += PI; 
            newPoint = p5.Vector.fromAngle(this.currentAngle).mult(speed).add(lastPoint);
        }
    
        this.stayWithinBounds(newPoint);
        this.points.push(newPoint);
        this.noiseOffset += 0.1;
    
        if (this.points.length > 100) {
            this.points.shift();
        }
    
        this.insideImage = this.isOverAssignedImage(lastPoint);
    }

    calculateAngleAwayFromClosestImageCenter(point) {
        let closestDistance = Infinity;
        let closestImageCenter;
    
        for (let i = 0; i < images.length; i++) {
            let img = images[i];
            // Exclude the assigned image from the repulsion mechanism
            if (i !== this.assignedImageIdx) {
                let distance = dist(point.x, point.y, imgCenter.x, imgCenter.y);
                if (distance < closestDistance && this.isOverImage(point, img)) {
                    closestDistance = distance;
                    closestImageCenter = imgCenter;
                }
            }
        }
    
        if (closestImageCenter) {
            return p5.Vector.sub(point, closestImageCenter).heading();
        }
        
        return random(TWO_PI);
    }
    

    calculateAngleTowardsImage(point, imgIdx) {
        if (this.insideImage) {
            return random(TWO_PI);
        }
        let angleTowardsImage = p5.Vector.sub(imgCenter, point).heading();
        return angleTowardsImage;
    }

    display() {
        noFill();
        stroke(this.color);
        strokeWeight(.5);
        beginShape();
        for (let pt of this.points) {
            vertex(pt.x, pt.y)
        }
        endShape();
    }
}