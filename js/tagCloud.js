function TagCould(selector){
	// 球形标签云半径
	this.radius = 150;
	// 弧度
	this.radian = Math.PI/180;

	// 根据z轴距离设置缩放和透明度的基数
	this.d = 500;

	// 标签的属性集合
	this.attrList = [];
	// 标志当前是否有外力（如：鼠标响应）影响标签云运动
	this.active = false;

	// 标签对应坐标轴的运行速度
	// 区别 this.speed ==> 整体速度
	this.lastY = 1;
	this.lastY = 1;

	// 标签是否均匀分布
	this.distr = true;

	// 鼠标响应点距标签云中心距离
	this.mouseX = 0;
	this.mouseY = 0;

	// 运行速度 与 鼠标响应点距 标签云中心距离 (即mouseX,Y) 成正比
	// 因此设置最大距离
	this.speed = 1;
	this.maxDistance = 250;

	this.howElliptical = 1;

	// 标签元素对象
	this.tagElem = null;
	// 标签响应区域对象
	this.targetArea = null;
	
	// 选择标签响应区域对象 的css表达式
	this.selector = selector;
	
}

TagCould.prototype.start = function(){
	var i = 0, oTag = null, self = this;

	this.targetArea = typeof this.selector == "string" ? document.querySelector(this.selector) : this.selector;
	
	this.tagElem = this.targetArea.getElementsByTagName('a');
	
	for(i = 0; i < this.tagElem.length; i++){
		oTag={};
		
		oTag.offsetWidth = this.tagElem[i].offsetWidth;
		oTag.offsetHeight = this.tagElem[i].offsetHeight;

		this.attrList.push(oTag);
	}
	
	this.sineCosine( 0, 0, 0 );
	
	this.initPosition();
	
	this.targetArea.addEventListener('mouseover',function(){
		self.active = true;
	}, false);
	
	this.targetArea.addEventListener('mouseout',function(){
		self.active = false;
	}, false);
	
	this.targetArea.addEventListener('mousemove',function(evt){
		//var oEvent=window.event || evt;
		self.onmove(window.event || evt);
	}, false);
	
	this.targetArea.addEventListener('touchstart',function(){
		self.active = true;
	}, false);
	this.targetArea.addEventListener('touchmove',function(evt){
		self.onmove(window.event || evt);
	}, false);
	this.targetArea.addEventListener('touchend',function(){
		self.active = false;
	}, false);
	
	//响应式 ==> 根据宽度设置标签云球半径及最大距离
	(this.targetArea.offsetWidth < 300) && (this.radius = this.targetArea.offsetWidth);


	setInterval(function(){
		self.update();
	}, 30);

}

TagCould.prototype.onmove = function(oEvent){
	//var oEvent=window.event || evt;
	// oEvent.preventDefault();  
	
	if(oEvent.touches && oEvent.touches.length > 0){
		oEvent.clientX = oEvent.touches[0].clientX;
		oEvent.clientY = oEvent.touches[0].clientY;
	}

	// (clientX,clientY) 					==>		响应点坐标(相对屏幕)
	// (offsetLeft,offsetTop) 		==>		响应区域距屏幕的距离
	// (offsetWidth,offsetHeifht)	==>		相应区域可见区域的宽高(content+padding+border)
	// ==> 保证得到的结果是相对于响应区域中心 ==> 标签云中心
	this.mouseX = oEvent.clientX - (this.targetArea.offsetLeft + this.targetArea.offsetWidth / 2);
	this.mouseY = oEvent.clientY - (this.targetArea.offsetTop + this.targetArea.offsetHeight / 2);

}

TagCould.prototype.update = function(){
	var x,y;
	
	// 调整标签滚动速度
	if(this.active){// 有鼠标事件响应
		x = ( this.mouseY / this.radius ) * this.speed;
		y = ( -this.mouseX / this.radius ) * this.speed;
	}
	// 否则 速度逐渐减慢
	else{
		x = this.lastY * 0.98;
		y = this.lastY * 0.98;
	}
	
	this.lastY = x;
	this.lastY = y;
	
	// 速度太小时停止
	if(Math.abs(x)<=0.01 && Math.abs(y)<=0.01){
		return;
	}
	
	// z 轴方向距离，默认0
	var z = 0;

	// 根据速度获取运行角度
	this.sineCosine(x,y,z);
	for(var j = 0; j < this.attrList.length; j++){
				// 计算新位置
		var rx1 = this.attrList[j].cx,
				ry1 = this.attrList[j].cy * this.cosX + this.attrList[j].cz * (-this.sinX),
				rz1 = this.attrList[j].cy * this.sinX + this.attrList[j].cz * this.cosX,

				rx2 = rx1 * this.cosY + rz1 * this.sinY,
				ry2 = ry1,
				rz2 = rx1 * (-this.sinY) + rz1 * this.cosY,

				rx3 = rx2 * this.cosZ + ry2 * (-this.sinZ),
				ry3 = rx2 * this.sinZ + ry2 * this.cosZ,
				rz3 = rz2;
		
		this.attrList[j].cx = rx3;
		this.attrList[j].cy = ry3;
		this.attrList[j].cz = rz3;
		
		// 
		var per = this.d / (this.d + rz3);
		
		this.attrList[j].x = ( this.howElliptical * rx3 * per ) - ( this.howElliptical * 2 );
		this.attrList[j].y = ry3 * per;
		this.attrList[j].scale = per;
		this.attrList[j].alpha = per;
		
		this.attrList[j].alpha = (this.attrList[j].alpha - 0.6) * ( 10 / 6 );
	}
	
	this.setPosition();
	this.depthSort();
}

// 设置 z-index ==> 根据元素 Z 轴上距离的大小设置 z-index
TagCould.prototype.depthSort = function(){
	var i=0,
			length = this.tagElem.length,
			aTmp=[];
	
	for(;i < length;i++){
		aTmp.push(this.tagElem[i]);
	}
	// 降序排列
	aTmp.sort(
		function (vItem1, vItem2){
			// if(vItem1.cz > vItem2.cz){
			// 	return -1;
			// }
			// else if(vItem1.cz < vItem2.cz){
			// 	return 1;
			// }
			// else{
			// 	return 0;
			// }
			return vItem2.cz - vItem1.cz;
		}
	);
	
	for(i=0;i< length;i++){
		aTmp[i].style.zIndex = i;
	}
}

// 初始化 : 随机分布所有标签位置
TagCould.prototype.initPosition = function (){
	var phi = 0,
			theta = 0,
			max = this.attrList.length,
			i = 0,
			aTmp = [],
			oFragment = document.createDocumentFragment();
	
	//随机排序
	for(i=0;i<this.tagElem.length;i++){
		aTmp.push(this.tagElem[i]);
	}
	
	aTmp.sort(
		function (){
			return Math.random()<0.5?1:-1;
		}
	);
	
	for(i=0;i<aTmp.length;i++){
		oFragment.appendChild(aTmp[i]);
	}
	
	this.targetArea.appendChild(oFragment);
	
	for( var i=1; i< max+1; i++){
		if( this.distr ){
			// Math.acos 反余弦值。返回的值是 0 到 PI 之间的弧度值
			// i 有规律 --> 弧度不同且有规律 ==> 标签分布均匀
			phi = Math.acos(-1+(2*i-1)/max);
			theta = Math.sqrt(max*Math.PI)*phi;
		}
		else{
			phi = Math.random() * (Math.PI);
			theta = Math.random() * (2*Math.PI);
		}
		
		//坐标变换 ==> 变为相对于 响应区域 的坐标
		this.attrList[i-1].cx = this.radius * Math.cos(theta) * Math.sin(phi);
		this.attrList[i-1].cy = this.radius * Math.sin(theta) * Math.sin(phi);
		this.attrList[i-1].cz = this.radius * Math.cos(phi);
		
		this.tagElem[i-1].style.left = this.attrList[i-1].cx + this.targetArea.offsetWidth/2 - this.attrList[i-1].offsetWidth/2+'px';
		this.tagElem[i-1].style.top = this.attrList[i-1].cy + this.targetArea.offsetHeight/2 - this.attrList[i-1].offsetHeight/2+'px';
	}
}

// 设置标签位置,字体大小及透明度
TagCould.prototype.setPosition = function(){
	
	var l = this.targetArea.offsetWidth / 2,
			t = this.targetArea.offsetHeight / 2;

	for(var i = 0,length = this.attrList.length; i < length; i++){
		
		this.tagElem[i].style.left = this.attrList[i].cx + l - this.attrList[i].offsetWidth / 2+'px';
		this.tagElem[i].style.top = this.attrList[i].cy + t - this.attrList[i].offsetHeight / 2+'px';
		
		this.tagElem[i].style.fontSize = Math.ceil(12 * this.attrList[i].scale / 2) + 8 + 'px';
		
		this.tagElem[i].style.filter = "alpha(opacity=" + 100 * this.attrList[i].alpha + ")";
		this.tagElem[i].style.opacity = this.attrList[i].alpha;
	}
}


TagCould.prototype.sineCosine = function( x, y, z){
	this.sinX = Math.sin(x * this.radian);
	this.cosX = Math.cos(x * this.radian);
	this.sinY = Math.sin(y * this.radian);
	this.cosY = Math.cos(y * this.radian);
	this.sinZ = Math.sin(z * this.radian);
	this.cosZ = Math.cos(z * this.radian);
}

window.onload = function(){
	var tagCloud = new TagCould("#targetArea");
	tagCloud.start();
}