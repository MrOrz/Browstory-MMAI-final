/*global Pixastic, util */

function segmentation(img, rect, debug){
	"use strict";
	var width = img.width, height = img.height,
	    colorimg = Pixastic.process(img, "crop", { // original img
			rect : {
				left : 0, top : 0, width : width, height : height
			}
		});

	// coloring context
	var ctx = img.getContext('2d'),
			colors = ['#ff0000', '#00ff00', '#0000ff', '#00ffff', '#ff00ff', '#ffff00'],
			i,
			cropimage, cropimage2;
	for(i=0; i<rect.length; ++i){
		ctx.fillStyle = colors[i];
		ctx.fillRect(rect[i].left, rect[i].top,
			rect[i].width, rect[i].height);
	}

	// start segmentation
	var hor = new Array(3),
		ver = new Array(3),
		j,k,cut,maxcut,maxdiff,diff;

	hor[0] = ver[0] = hor[3] = ver[3] = 0;
	for(i=1; i<=7; i+=2)
	{
		cropimage = Pixastic.process(img, "crop", {
			rect : {
				left   : Math.floor(width/3)*(i%3),
				top    : Math.floor(height/3)*Math.floor(i/3),
				width  : Math.ceil(width/3),
				height : Math.ceil(height/3)
			}
		});
		if(i%3===1)
		{
			maxdiff = -1;
			for(cut=1; cut<Math.ceil(height/3); cut+=5)
			{
				var top = cropimage.getContext('2d').getImageData(0, 0, Math.ceil(width/3), cut).data,
					bottom = cropimage.getContext('2d').getImageData(0, cut, Math.ceil(width/3), Math.ceil(height/3)-cut).data;
				diff = util.distance(top,bottom);
				if(maxdiff===-1||diff>maxdiff)
				{
					maxdiff = diff;
					maxcut = cut;
				}
			}
			//maxcut=50;
			hor[(i-1)/6+1] = ((i-1)/6+1===2)?maxcut:Math.ceil(height/3)-maxcut;
		}
		else
		{
			maxdiff = -1;
			for(cut=1; cut<Math.ceil(width/3); cut+=5)
			{
				var left = cropimage.getContext('2d').getImageData(0, 0, cut, Math.ceil(height/3)).data,
					right = cropimage.getContext('2d').getImageData(cut, 0, Math.ceil(width/3)-cut, Math.ceil(height/3)).data;
				diff = util.distance(left,right);
				if(maxdiff===-1||diff>maxdiff)
				{
					maxdiff = diff;
					maxcut = cut;
				}
			}
			//maxcut=50;
			ver[(i-1)/2] = ((i-1)/2===2)?maxcut:Math.ceil(width/3)-maxcut;
		}
	}

	var canvas = Pixastic.process(img, "crop", {
			rect : {
				left : 0, top : 0, width : width, height : height
			}
			});
	ctx = canvas.getContext('2d');
	ctx.fillStyle="#000";
	ctx.fillRect(0,Math.floor(height/3)-hor[1],width,2);
	ctx.fillRect(0,Math.floor(height/3)*2+hor[2],width,2);
	ctx.fillRect(Math.floor(width/3)-ver[1],0,2,height);
	ctx.fillRect(Math.floor(width/3)*2+ver[2],0,2,height);

	// Similarity test among nine blocks
	var adj = new Array(8),
		L = new Array(8),
		C = new Array(8),
		thr = 0.002;

	adj[0] = [1,3];
	adj[1] = [4];
	adj[2] = [1,5];
	adj[3] = [4];
	adj[4] = [7];
	adj[5] = [4];
	adj[6] = [3,7];
	adj[7] = [8];
	adj[8] = [5];
	cropimage = new Array(8);
	cropimage2 = new Array(8);

	for(i=0; i<=8; i++)
	{
		L[i]=i;
		cropimage[i] = colorimg.getContext('2d').getImageData(
			Math.floor(width/3) * (i%3) + (i%3===1?-1:1) * ver[i%3],
			Math.floor(height/3) * Math.floor(i/3) + (Math.floor(i/3)===1?-1:1)*hor[Math.floor(i/3)],
			Math.ceil(width/3)-(i%3===1?-1:1)*ver[i%3]-(i%3===1?-1:1)*ver[i%3+1],
			Math.ceil(height/3)-(Math.floor(i/3)===1?-1:1)*hor[Math.floor(i/3)] -
				(Math.floor(i/3)===1?-1:1)*hor[Math.floor(i/3)+1]
		);
		cropimage2[i] = img.getContext('2d').getImageData(
			Math.floor(width/3) * (i%3) + (i%3===1?-1:1) * ver[i%3],
			Math.floor(height/3) * Math.floor(i/3) + (Math.floor(i/3)===1?-1:1)*hor[Math.floor(i/3)],
			Math.ceil(width/3)-(i%3===1?-1:1)*ver[i%3]-(i%3===1?-1:1)*ver[i%3+1],
			Math.ceil(height/3)-(Math.floor(i/3)===1?-1:1)*hor[Math.floor(i/3)] -
				(Math.floor(i/3)===1?-1:1)*hor[Math.floor(i/3)+1]
		);
		C[i] = util.ColorF(cropimage[i].data);
	}

	for(i=0; i<=8; i++) //cluster among adjacent blocks
	{
		if(cropimage[i].height<height/20){
			L[i]=L[3+i%3]=Math.min(L[i],L[3+i%3]);
		}
		else if(cropimage[i].width<width/20){
			L[i]=L[Math.floor(i/3)*3+1]=Math.min(L[i],L[Math.floor(i/3)*3+1]);
		}
		else
		{
			maxdiff = -1;
			for(j=0; j<adj[i].length; j++)
			{
				diff = util.distance(cropimage2[i].data,cropimage2[adj[i][j]].data);
				//console.log('diff('+i+','+adj[i][j]+')='+diff);
				if(diff<maxdiff||maxdiff===-1)
				{
					maxdiff = diff;
					k = adj[i][j];
				}
			}
			if(maxdiff<thr){
				L[i]=L[k]=Math.min(L[i],L[k]);
			}
		}
	}

	if(debug){
		// FIXME: debug purpose
		var imgToShow = new Image();
		imgToShow.onload = function(){
			document.body.appendChild(imgToShow);
		}
		imgToShow.src = canvas.toDataURL();
	}

	console.log('L:'+L);
	// Layout feature extraction
	var F = [0,0,0,0,0,0];
	// Horrizontal
	for(i=0; i<=2; i++)
	{
		if(L[3*i]===L[3*i+1]&&L[3*i]===L[3*i+2])
		{
			F[i] = 1;
		}
		else
		{
			if(L[3*i]===L[3*i+1]||L[3*i]===L[3*i+2]||L[3*i+1]===L[3*i+2])
			{
				F[i] = 2;
			}
			else
			{
				F[i] = 3;
			}
		}
	}
	// Vertical
	for(i=0; i<=2; i++)
	{
		if(L[i]===L[i+3]&&L[i]===L[i+6])
		{
			F[i+3] = 1;
		}
		else
		{
			if(L[i]===L[i+3]||L[i]===L[i+6]||L[i+3]===L[i+6])
			{
				F[i+3] = 2;
			}
			else
			{
				F[i+3] = 3;
			}
		}
	}
	var C1d = [];
	for(i=0; i<C.length; ++i){
		C1d = C1d.concat(C[i]);
	}

	console.log('F:', F, 'C:', C1d);
	return {
		structure: F,
		canvas: canvas,
		colormap: C1d
	};
}