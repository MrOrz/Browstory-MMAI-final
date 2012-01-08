var util = (function (){
	"use strict";
	function RGB2HSV(R,G,B){// RGB to HSV
		var r=R/255, g=G/255, b=B/255, H, S, V;
		var minRGB = Math.min(r,g,b),
				maxRGB = Math.max(r,g,b);

		// Black-gray-white
		if (minRGB===maxRGB) {
				V = minRGB;
				return [0,0,V*0.9999];
		}

		// Colors other than black-gray-white:
		var d = (r===minRGB) ? g-b : ((b===minRGB) ? r-g : b-r);
		var h = (r===minRGB) ? 3 : ((b===minRGB) ? 1 : 5);
		H = 60*(h - d/(maxRGB - minRGB));
		S = (maxRGB - minRGB)/maxRGB;
		V = maxRGB;
		return [H*0.9999,S*0.9999,V*0.9999];
	}
	function histHSV(imageData){
		//var imageData = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
		var hist = [], i, H, S, V, HSV, imageSize = imageData.length/4;

		// H: 18 bins, S:3 bins, V:3 bins, gray: 4 bins
		// Pixel with HSV = [h,s,v] are put into bin number 3*3*h + 3*s + v,
		// where h in [0, 18), s in [0, 3) and v in [0, 3),
		// and gray pixels are put in bin number 162~165.
		for(i=0; i<166; i+=1){
			hist[i] = 0;
		}

		for(i=0; i<imageSize*4; i+=4){ // histogram count
			//R:imageData[i] G:imageData[i+1] B:imageData[i+2]
			HSV=RGB2HSV(imageData[i], imageData[i+1], imageData[i+2]);
			H = Math.floor(HSV[0]/360 * 18);
			S = Math.floor(HSV[1] * 4); // 3+1 extra bin for gray pixels
			V = Math.floor(HSV[2] * 3);

		// gray pixels, saturation is low
			if(S === 0){
				 // quantize the HSV[2] into 4 steps
			 hist[162 + Math.floor(HSV[2]*4)] += 1;
			 continue;
			}

			// shift S from 1~3 to 0~2
			S -= 1;
			if(9*H+3*S+V >= 166){ console.log('HSV = ',H,S,V); }
			hist[9*H+3*S+V] += 1;
		}
		for(i=0; i<166; i+=1){
			hist[i]/=imageSize;
		}
		return hist;
	}
	function distance(img1,img2){
		var hist1=histHSV(img1),
			hist2=histHSV(img2),
			sum = 0, i;
		for(i=0; i<hist1.length; i++)
		{
			sum += (hist1[i]-hist2[i])*(hist1[i]-hist2[i]);
		}
		return sum;
	}
	function ColorF(img){
		var hist = histHSV(img), i, max=-1, second=-1,
			maxindex = new Array(1), C = new Array(3);
		// Find dominant colors
		for(i=0; i<hist.length; i++)
		{
			if(hist[i]>max)
			{
				second=max;
				maxindex[1]=maxindex[0];
				max=hist[i];
				maxindex[0]=i;
			}
			else if(hist[i]>second)
			{
				second=hist[i];
				maxindex[1]=i;
			}
		}
		if(second==-1||second==0) maxindex[1] = maxindex[0];
		// Quantization
		for(i=0; i<2; i++)
		{
			if(maxindex[i]<162)
			{
				var H = Math.floor(maxindex[i]/9);
				C[2*i] = Math.floor(H*20/45)*45+22.5;
				C[2*i+1] = (H*20)<22.5?360:Math.ceil((H*20-22.5)/45)*45;
			}
			else
			{
				var S = maxindex[i]-162;
				C[2*i] = C[2*i+1] = -S;
			}
		}
		return C;
	}
	function showHist(hist){
		var h, s, v, $target = $('<div>'), option;
		for(h=0; h<18; ++h){
				for(s=0; s<3; ++s){
						for(v=0; v<3; ++v){
								option = {style: 'background: hsl('+(h/18*360)+','+((s+1)/4*100)+'%,'+(v/3*100)+'%);'};
								if(v === 0){ // make text white if bg is dark
										option.style += 'color: #fff;';
								}
								$target.append($('<span>', option).text(hist[9*h+3*s+v]));
						}
				}
				$target.append($('<br />'));
		}
		for(v=0; v<4; ++v){
			 option = {style: 'background: hsl(0,0%,'+(v/4*100)+'%);'};
			 if(v === 0){ // make text white if bg is dark
					 option.style += 'color: #fff;';
			 }
			 $target.append($('<span>', option).text(hist[162+v]));
		}

		$('body').append($target);
	}

	// expose the functions
	//
	return {
		distance: distance,
		ColorF: ColorF,
		RGB2HSV: RGB2HSV,
		histHSV: histHSV,
		showHist: showHist
	}
}());