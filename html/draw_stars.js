// Tiny Star Plot
// license : public domain
// witten by Kuroda Dycoon
// https://github.com/dycoon/tiny_star_plot

var viewSize = 640;
var starImage = null;
var view = null;
var canvas = null;
var context = null;

var viewMatrix;
var projectionMatrix;
var screenMatrix;
var stars = [];
var rx = 0.0;
var ry = 0.0;
var ox = 0.0;
var oy = 0.0;
var touching = false;
var drawCounter = 0;
var changed = false;

var loadCount = 0;
var onLoad = function(){
    loadCount--;
    if(loadCount == 0){
        startRender();
    }
};

var Vec3 = {
    create : function(x, y, z){
        return {x : x, y : y, z : z};
    },
    spherical : function(theta, phi){
        return Vec3.create(
            Math.cos(phi) * Math.cos(theta), 
            Math.sin(phi), 
            Math.cos(phi) * Math.sin(theta));
    }
};

var Mat4x4 = {
    create : function(
            m00, m01, m02, m03,
            m10, m11, m12, m13,
            m20, m21, m22, m23,
            m30, m31, m32, m33
        ){
        return {
            m00 : m00, m01 : m01, m02 : m02, m03 : m03,
            m10 : m10, m11 : m11, m12 : m12, m13 : m13,
            m20 : m20, m21 : m21, m22 : m22, m23 : m23,
            m30 : m30, m31 : m31, m32 : m32, m33 : m33
        };
    },
    
    ident : function(){
        return this.create(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
    },
    
    projection : function(s){
        return this.create(
            s, 0, 0, 0,
            0, s, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
    },
    
    screen : function(sz){
        return this.create(
            sz / 2.0, 0, 0, sz / 2.0,
            0, -sz / 2.0, 0, sz / 2.0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
    },
    
    transform : function(m, v){
        return Vec3.create(
            v.x * m.m00 + v.y * m.m01 + v.z * m.m02 + m.m03, 
            v.x * m.m10 + v.y * m.m11 + v.z * m.m12 + m.m13, 
            v.x * m.m20 + v.y * m.m21 + v.z * m.m22 + m.m23
        );
    },
    
    transposeInv : function(m){
        return this.create(
            m.m00, m.m10, m.m20, - m.m03 * m.m00 - m.m13 * m.m10 - m.m23 * m.m20,
            m.m01, m.m11, m.m21, - m.m03 * m.m01 - m.m13 * m.m11 - m.m23 * m.m21,
            m.m02, m.m12, m.m22, - m.m03 * m.m02 - m.m13 * m.m12 - m.m23 * m.m22,
            0, 0, 0, 1
        );
    },
    
    mult : function(a, b){
        return this.create(
            a.m00 * b.m00 + a.m01 * b.m10 + a.m02 * b.m20 + a.m03 * b.m30,
            a.m00 * b.m01 + a.m01 * b.m11 + a.m02 * b.m21 + a.m03 * b.m31,
            a.m00 * b.m02 + a.m01 * b.m12 + a.m02 * b.m22 + a.m03 * b.m32,
            a.m00 * b.m03 + a.m01 * b.m13 + a.m02 * b.m23 + a.m03 * b.m33,
            
            a.m10 * b.m00 + a.m11 * b.m10 + a.m12 * b.m20 + a.m13 * b.m30,
            a.m10 * b.m01 + a.m11 * b.m11 + a.m12 * b.m21 + a.m13 * b.m31,
            a.m10 * b.m02 + a.m11 * b.m12 + a.m12 * b.m22 + a.m13 * b.m32,
            a.m10 * b.m03 + a.m11 * b.m13 + a.m12 * b.m23 + a.m13 * b.m33,
            
            a.m20 * b.m00 + a.m21 * b.m10 + a.m22 * b.m20 + a.m23 * b.m30,
            a.m20 * b.m01 + a.m21 * b.m11 + a.m22 * b.m21 + a.m23 * b.m31,
            a.m20 * b.m02 + a.m21 * b.m12 + a.m22 * b.m22 + a.m23 * b.m32,
            a.m20 * b.m03 + a.m21 * b.m13 + a.m22 * b.m23 + a.m23 * b.m33,
            
            a.m30 * b.m00 + a.m31 * b.m10 + a.m32 * b.m20 + a.m33 * b.m30,
            a.m30 * b.m01 + a.m31 * b.m11 + a.m32 * b.m21 + a.m33 * b.m31,
            a.m30 * b.m02 + a.m31 * b.m12 + a.m32 * b.m22 + a.m33 * b.m32,
            a.m30 * b.m03 + a.m31 * b.m13 + a.m32 * b.m23 + a.m33 * b.m33
        );
    },
    
    rotX : function(r){
        return this.create(
            1, 0, 0, 0,
            0, Math.cos(r), -Math.sin(r), 0,
            0, Math.sin(r), Math.cos(r), 0,
            0, 0, 0, 1
        );
    },
    
    rotY : function(r){
        return this.create(
            Math.cos(r), 0, Math.sin(r), 0,
            0, 1, 0, 0,
            -Math.sin(r), 0, Math.cos(r), 0,
            0, 0, 0, 1
        );
    },
    
    rotZ : function(r){
        return this.create(
            Math.cos(r), -Math.sin(r), 0, 0,
            Math.sin(r), Math.cos(r), 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
    }
    
};

var init = function(){
    starImage = new Image();
    starImage.src = "star.png";
    starImage.onload = onLoad;
    loadCount++;
    
    
    view = document.getElementById("view");
    
    canvas = document.createElement('canvas');
    canvas.width = viewSize;
    canvas.height = viewSize;
    
    var h;
    var vw;
    h = window.innerHeight - 80;
    vw = Math.min(window.innerWidth, h)
    
    canvas.style.width = Math.floor(vw) + "px";
    canvas.style.height = Math.floor(vw) + "px";
    
    context = canvas.getContext("2d");
    
    view.appendChild(canvas);

    var text = document.getElementById("text");
    text.style.top = Math.floor(vw) + "px";

    //
    
    viewMatrix = Mat4x4.ident();
    projectionMatrix = Mat4x4.projection(2.0);
    screenMatrix = Mat4x4.screen(viewSize);
    
    var i, isz;
    var s;
    isz = starCatalogue.length;
    for(i = 0 ; i < isz ; i++){
        s = starCatalogue[i];
        stars.push({
            id : s.id,
            pos : Vec3.spherical(s.ra, s.de),
            b : s.b
        });
    }
}

var drawSphere = function(m){
    
    var i, isz;
    var j, jsz;
    var x, y;
    
    var sv;
    var sv0, sv1;
    
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.strokeStyle = "rgba(255, 255, 255, 0.25)";
    context.lineWidth = 1.0;
    
    isz = 8;
    jsz = 64;
    
    for(i = 0 ; i < isz ; i++){
        for(j = 0 ; j < jsz ; j++){
            
            x = j / jsz * 2.0 * Math.PI;
            y = i / isz * Math.PI + Math.PI / 2.0;
            sv = Vec3.spherical(x, y);
            sv0 = Mat4x4.transform(m, sv);
            
            x = (j + 1) / jsz * 2.0 * Math.PI;
            sv = Vec3.spherical(x, y);
            sv1 = Mat4x4.transform(m, sv);
            
            if(sv0.z > 0.1 && sv1.z > 0.1){
                
                sv0.x /= sv0.z;
                sv0.y /= sv0.z;
                sv0.z = 1.0;

                sv0 = Mat4x4.transform(screenMatrix, sv0);
                
                sv1.x /= sv1.z;
                sv1.y /= sv1.z;
                sv1.z = 1.0;

                sv1 = Mat4x4.transform(screenMatrix, sv1);
                
                context.beginPath();
                context.moveTo(sv0.x, sv0.y);
                context.lineTo(sv1.x, sv1.y);
                context.closePath();
                
                context.stroke();
            }
            
            
        }
    }
    
    isz = 8;
    jsz = 64;
    
    for(i = 0 ; i < isz ; i++){
        for(j = 0 ; j < jsz ; j++){
            
            x = i / isz * Math.PI;
            y = j / jsz * 2.0 * Math.PI + Math.PI / 2.0;
            sv = Vec3.spherical(x, y);
            sv0 = Mat4x4.transform(m, sv);
            
            y = (j + 1) / jsz * 2.0 * Math.PI + Math.PI / 2.0;
            sv = Vec3.spherical(x, y);
            sv1 = Mat4x4.transform(m, sv);
            
            if(sv0.z > 0.1 && sv1.z > 0.1){
                
                sv0.x /= sv0.z;
                sv0.y /= sv0.z;
                sv0.z = 1.0;

                sv0 = Mat4x4.transform(screenMatrix, sv0);
                
                sv1.x /= sv1.z;
                sv1.y /= sv1.z;
                sv1.z = 1.0;

                sv1 = Mat4x4.transform(screenMatrix, sv1);
                
                context.beginPath();
                context.moveTo(sv0.x, sv0.y);
                context.lineTo(sv1.x, sv1.y);
                context.closePath();
                
                context.stroke();
            }
            
            
        }
    }
}

var currentDraw = null;
var startRender = function(){
    
    drawCounter++;
    
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = "rgb(0, 0, 0)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    //context.setTransform(1, 0, 0, 1, 10, 10);
    //context.drawImage(starImage, 0, 0);
    
    var mx, my;
    
    mx = Mat4x4.rotX(ry);
    my = Mat4x4.rotY(rx);
    
    viewMatrix = Mat4x4.mult(my, mx);
    
    var iv;
    var m;
    iv = Mat4x4.transposeInv(viewMatrix);
    m = Mat4x4.mult(projectionMatrix, iv);
    
    var i, isz;
    
    var s;
    var sc;
    var sv;
    var offset = 0;
  
    drawSphere(m);
    
    var oldDrawCounter = drawCounter;
    
    var drawStars = function(){
        if(oldDrawCounter != drawCounter){
            return;
        }
        
        isz = 1000;
        for(i = 0 ; i < isz ; i++){
            s = stars[offset + i];

            sv = Mat4x4.transform(m, s.pos);

            if(sv.z > 0.1){
                sv.x /= sv.z;
                sv.y /= sv.z;
                sv.z = 1.0;

                sv = Mat4x4.transform(screenMatrix, sv);

                sc = 0.5 / Math.pow(1.4, s.b);
                context.setTransform(sc, 0, 0, sc, sv.x, sv.y);
                context.drawImage(starImage, -16, -16);
            }

        }
        offset += isz;
        
        if(offset >= stars.length){
            currentDraw = null;
        }
    };
    
    drawStars();
    currentDraw = drawStars;
};

var timer = function(){
    
    if(changed){
        startRender();
        changed = false;
    }
    else if(currentDraw){
        currentDraw();
    }
    
}

var touchDown = function(event) {
    if(event.changedTouches && event.changedTouches.length > 0){
        ox = event.changedTouches[0].pageX;
        oy = event.changedTouches[0].pageY;
    }
    else{
        ox = event.pageX;
        oy = event.pageY;
    }
    
    pastTouch = new Date();
    touching = true;
    
    event.preventDefault();
};

var touchMove = function(event) {
    if(touching){
        var sc = 0.01;
        if(event.changedTouches && event.changedTouches.length > 0){
            rx += (ox - event.changedTouches[0].pageX) * sc;
            ry += (oy - event.changedTouches[0].pageY) * sc;
            ox = event.changedTouches[0].pageX;
            oy = event.changedTouches[0].pageY;
        }
        else{
            rx += (ox - event.pageX) * sc;
            ry += (oy - event.pageY) * sc;
            ox = event.pageX;
            oy = event.pageY;
        }
        
        if(ry < -Math.PI / 2.0){
            ry = -Math.PI / 2.0
        }
        if(ry > Math.PI / 2.0){
            ry = Math.PI / 2.0
        }
        
        changed = true;
        
    }
    
    event.preventDefault();
    
};

var touchUp = function(event){
    touching = false;
    
    event.preventDefault();
}

window.addEventListener("load", function(){
    
    init();
    
    canvas.addEventListener('touchstart', touchDown, true);
    canvas.addEventListener('touchmove', touchMove, true);
    canvas.addEventListener('touchend', touchUp, true);

    canvas.addEventListener('mousedown', touchDown, true);
    canvas.addEventListener('mousemove', touchMove, true);
    canvas.addEventListener('mouseup', touchUp, true);
    
    setInterval(timer, 32);
    
}, false);




