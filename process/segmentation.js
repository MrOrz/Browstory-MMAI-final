"use strict"
function segmentation(img, debug){
	var hor = new Array(3),
		ver = new Array(3),
		i,j,cut,maxcut,maxdiff,diff,
		width = img.width, height = img.height;
	hor[0] = ver[0] = hor[3] = ver[3] = 0;
	for(i=1; i<=7; i+=2)
	{
		var	cropimage = Pixastic.process(img, "crop", {
			rect : {
				left : Math.floor(width/3)*(i%3), top : Math.floor(height/3)*Math.floor(i/3), width : Math.ceil(width/3), height : Math.ceil(height/3)
			}
			});
		if(i%3==1)
		{
			maxdiff = -1;
			for(cut=1; cut<Math.ceil(height/3); cut+=5)
			{
				var top = cropimage.getContext('2d').getImageData(0, 0, Math.ceil(width/3), cut).data,
					bottom = cropimage.getContext('2d').getImageData(0, cut, Math.ceil(width/3), Math.ceil(height/3)-cut).data;
				diff = distance(top,bottom);
				if(maxdiff==-1||diff>maxdiff)
				{
					maxdiff = diff;
					maxcut = cut;
				}
			}
			//maxcut=50;
			hor[(i-1)/6+1] = ((i-1)/6+1==2)?maxcut:Math.ceil(height/3)-maxcut;
		}
		else
		{
			maxdiff = -1;
			for(cut=1; cut<Math.ceil(width/3); cut+=5)
			{
				var left = cropimage.getContext('2d').getImageData(0, 0, cut, Math.ceil(height/3)).data,
					right = cropimage.getContext('2d').getImageData(cut, 0, Math.ceil(width/3)-cut, Math.ceil(height/3)).data;
				diff = distance(left,right);
				if(maxdiff==-1||diff>maxdiff)
				{
					maxdiff = diff;
					maxcut = cut;
				}
			}
			//maxcut=50;
			ver[(i-1)/2] = ((i-1)/2==2)?maxcut:Math.ceil(width/3)-maxcut;
		}
	}

	// Similarity test among nine blocks
	var adj = new Array(8);
		adj[0] = [1,3];
		adj[1] = [2,4];
		adj[2] = [5];
		adj[3] = [4,6];
		adj[4] = [5,7];
		adj[5] = [8];
		adj[6] = [7];
		adj[7] = [8];
		adj[8] = [];
	var cropimage = new Array(8),
		L = new Array(8),
		thr = 0.001;
	for(i=0; i<=8; i++)
	{
		L[i]=i;
		cropimage[i] = img.getContext('2d').getImageData(Math.floor(width/3)*(i%3)+(i%3==1?-1:1)*ver[i%3], Math.floor(height/3)*Math.floor(i/3)+(Math.floor(i/3)==1?-1:1)*hor[Math.floor(i/3)], Math.ceil(width/3)-(i%3==1?-1:1)*ver[i%3]-(i%3==1?-1:1)*ver[i%3+1], Math.ceil(height/3)-(Math.floor(i/3)==1?-1:1)*hor[Math.floor(i/3)]-(Math.floor(i/3)==1?-1:1)*hor[Math.floor(i/3)+1]).data;
	}
	var canvas = Pixastic.process(img, "crop", {
			rect : {
				left : 0, top : 0, width : width, height : height
			}
			});
	var ctx = canvas.getContext('2d');
	ctx.fillStyle="#000";
	ctx.fillRect(0,Math.floor(height/3)-hor[1],width,2);
	ctx.fillRect(0,Math.floor(height/3)*2+hor[2],width,2);
	ctx.fillRect(Math.floor(width/3)-ver[1],0,2,height);
	ctx.fillRect(Math.floor(width/3)*2+ver[2],0,2,height);
	for(i=0; i<=8; i++) //cluster among adjacent blocks
	{
		for(j=0; j<adj[i].length; j++)
		{
			diff = distance(cropimage[i],cropimage[adj[i][j]]);
			//console.log('diff('+i+','+adj[i][j]+')='+diff);
			if(diff<thr)
			{
				L[adj[i][j]]=L[i];
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
		if(L[3*i]==L[3*i+1]&&L[3*i]==L[3*i+2])
		{
			F[i] = 1;
		}
		else
		{
			if(L[3*i]==L[3*i+1]||L[3*i]==L[3*i+2]||L[3*i+1]==L[3*i+2])
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
		if(L[i]==L[i+3]&&L[i]==L[i+6])
		{
			F[i+3] = 1;
		}
		else
		{
			if(L[i]==L[i+3]||L[i]==L[i+6]||L[i+3]==L[i+6])
			{
				F[i+3] = 2;
			}
			else
			{
				F[i+3] = 3;
			}
		}
	}
	console.log('F:'+F);
	F.canvas = canvas;
	return F;
}