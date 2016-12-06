var canvas;
var gl;
var squareVerticesBuffer;
var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var perspectiveMatrix;
var squareRotation = 0.0//旋转系数
var lastSquareUpdateTime = 0;//变换时间

//初始化webgl
function initWebGL(){
    gl = null;
    try{
        gl = canvas.getContext("webgl")||canvas.getContext("experimental-webgl");
    }
    catch(e){}
    if(!gl){
        alert("初始化失败");
        gl = null;
    }
    return gl;
}
//

//开始
function start(){
    canvas = document.getElementById("glcanvas");
    initWebGL(canvas);
    console.log(gl);
    if(gl){
        gl.clearColor(0.0,0.0,0.0,1.0);//定义初始时的填充色和透明度，一般纯黑不透明，即3个0.0和一个1.0
        gl.clearDepth(1.0);//清除所有
        gl.enable(gl.DEPTH_TEST);//启用深度测试，理解应该是z轴方面的调试，或是启用z轴的意思
        gl.depthFunc(gl.LEQUAL);//近景遮盖远景，设置规则应该
        gl.viewport(0,0,canvas.width,canvas.height);//调整分辨率

        initShaders();
        initBuffers();
        setInterval(drawScene,15);
    }
}
//

//初始化着色器函数
function initShaders(){
    var fragmentShader = getShader(gl,"shader-fs");
    var vertexShader = getShader(gl,"shader-vs");

    //创建着色器
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram,vertexShader);
    gl.attachShader(shaderProgram,fragmentShader);
    gl.linkProgram(shaderProgram);

    //如果创建着色器失败,通过检查参数LINK_STATUS确定是否创建
    if(!gl.getProgramParameter(shaderProgram,gl.LINK_STATUS)){
        alert("无法初始化着色器");
    }

    gl.useProgram(shaderProgram);//如果创建成功，激活

    vertexPositionAttribute = gl.getAttribLocation(shaderProgram,"aVertexPosition");//初始化位置属性
    gl.enableVertexAttribArray(vertexPositionAttribute);

    vertexColorAttribute = gl.getAttribLocation(shaderProgram,"aVertexColor");//初始化颜色属性
    gl.enableVertexAttribArray(vertexColorAttribute);
}
//

//从DOM中加载着色器函数
function getShader(gl,id){
    var shaderScript,theSource,currentChild,shader;

    shaderScript = document.getElementById(id);

    if(!shaderScript){
        return null;
    }

    theSource = "";
    currentChild = shaderScript.firstChild;

    //遍历，构建一个字符串，着色器的
    while(currentChild){
        if(currentChild.nodeType == currentChild.TEXT_NODE){
            theSource += currentChild.textContent;
        }
        currentChild = currentChild.nextSibling;
    }
    //
    
    //区分着色器类型
    if(shaderScript.type == "x-shader/x-fragment"){
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    }else if(shaderScript.type == "x-shader/x-vertex"){
        shader = gl.createShader(gl.VERTEX_SHADER);
    }else{
        return nell;//未知类型
    }
    //
    
    //传递，send the source to the shader object源码将传到着色器上并编译
    gl.shaderSource(shader,theSource);
    //Compile the shader program
    gl.compileShader(shader);
    //判断是否组合成功
    if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
        alert("An error occurred compiling the shader:" + gl.getShaderInfoLog(shader));
        return null;
    }
    //

    return shader;
    //
}
//

//创建缓冲区存储顶点函数
function initBuffers(){
    squareVerticesBuffer = gl.createBuffer();//gl成员函数的createrBuffer()方法得到缓冲对象并存储在顶点缓冲器，然后用bindBuffer()绑定上下文
    gl.bindBuffer(gl.ARRAY_BUFFER,squareVerticesBuffer);

    //创建数组记录每一个顶点，然后将其转化为WebGL浮点型类型的数组，并传到gl对象的bufferData()方法来建立对象的顶点
    //canvas中心是圆点0.0，每3个数是一个点，顺序是x,y,z
    var vertices = [
        1.0,1.0,0.0,//右上点，第一象限
        -1.0,1.0,0.0,//左上点，第二象限
        1.0,-1.0,0.0,//右下点，第四象限
        -1.0,-1.0,0.0//左下点，第三象限
    ];

    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
    //缓冲区会设置很多属性的矩阵，每个属性矩阵都包括创建缓冲区，绑定上下文，传送到bufferData()这三个步骤
    
    //上面是确定顶点位置
    //下面是给顶点颜色，不同需求下着色器也不同
    var colors = [
        1.0,1.0,1.0,1.0,
        1.0,0.0,0.0,1.0,
        0.0,1.0,0.0,1.0,
        0.0,0.0,1.0,1.0
    ];
    squareVerticesColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER,squareVerticesColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(colors),gl.STATIC_DRAW);
}
//

//绘制场景函数
function drawScene(){
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);//第一步用背景色擦除上下文

    perspectiveMatrix = makePerspective(45,640.0/480.0,0.1,100.0);//建立摄像机透视矩阵，设置45度的视图角度，宽高比例为640/480画布尺寸，指定在摄像机距离0.1到100单位长度的范围内，物体可见

    loadIdentity();
    mvTranslate([-0.0,0.0,-6.0]);//加载特定位置，并把正方形放在距离摄像机6个单位的位置，3个坐标

    mvPushMatrix();
    mvRotate(squareRotation,[1,0,1]);//旋转效果，[1,0,1]中1代表延该轴旋转，可能不同的数效果不一样，但感觉真的不明显，后期再说

    gl.bindBuffer(gl.ARRAY_BUFFER,squareVerticesBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute,3,gl.FLOAT,false,0,0);//这两行使绘制时可以用到位置坐标数组

    gl.bindBuffer(gl.ARRAY_BUFFER,squareVerticesColorBuffer);
    gl.vertexAttribPointer(vertexColorAttribute,4,gl.FLOAT,false,0,0);//这两行使绘制时能用到颜色数组，3和4这个参数应是数组中每几个为一个组合的意思，位置用三个数确定一个顶点，颜色是rgba的模式，带透明属性


    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP,0,4);

    mvPopMatrix();//存储后再重加载原始矩阵的目的是：避免绘制其它图形时也受到这次旋转的影响。但在此例子中并没有绘制更多物体，所以在此这一步并没有实际意义。

    //计算旋转量
    var currentTime = (new Date).getTime();
    if(lastSquareUpdateTime){
        var delta = currentTime - lastSquareUpdateTime;

        squareRotation += (30 * delta) / 1000.0;
    }

    lastSquareUpdateTime = currentTime;
}
//


//矩阵
function loadIdentity(){
    mvMatrix = Matrix.I(4);
}
function multMatrix(m){
    mvMatrix = mvMatrix.x(m);
}
function mvTranslate(v){
    multMatrix(Matrix.Translation($V([v[0],v[1],v[2]])).ensure4x4());//数组很多层，这个错会报5837
//VM221:1 Uncaught TypeError: (a.elements || a).slice is not a function不知道耽误了多少时间！！
}
function setMatrixUniforms() {
    var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));

    var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
}
var mvMatrixStack = [];
function mvPushMatrix(m){
    if(m){
        mvMatrixStack.push(m.dup());
        mvMatrix = m.dup();
    }else{
        mvMatrixStack.push(mvMatrix.dup());
    }
}
function mvPopMatrix(){
    if(!mvMatrixStack.length){
        throw("不能从空矩阵中移出")
    }
    mvMatrix = mvMatrixStack.pop();
    return mvMatrix;
}
function mvRotate(angle,v){
    var inRadians = angle*Math.PI/180.0;

    var m = Matrix.Rotation(inRadians,$V([v[0],v[1],v[2]])).ensure4x4();
    multMatrix(m);
}