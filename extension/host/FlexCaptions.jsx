/**********************************************************************
 * FlexCaptions - CEP host engine (ExtendScript)
 * Called by the panel (client/index.html) through CSInterface.evalScript.
 * Exposes:  flexBuildFromFile(cfgJson)   flexAutoTranscribe(cfgJson,py,model)
 **********************************************************************/

// ---------- defaults (panel overrides these) ----------
function flexDefaults(){
    return {
        font:"Montserrat-ExtraBold", fontFallback:"Arial-BoldMT", upper:false,
        fontSize:150, autoScale:true, wordsPerGroup:3, yPercent:62,
        baseColor:[1,1,1], highlightColor:[0.118,0.60,1.0], highlightMode:"keyword",
        strokeOn:false, strokeColor:[0,0,0], strokeWidth:12,
        anim:"pop", popScale:118, animDur:0.14, wordStagger:0.05, holdPad:0.04,
        layout:"line", gapBreak:0.45, maxWidthPercent:86, shadow:true,
        boxOn:false, boxMode:"keyword", boxColor:[0.118,0.60,1.0], boxRound:28, boxPadX:0.18, boxPadY:0.10,
        emojiOn:false
    };
}
function flexMerge(cfg){ var d=flexDefaults(); for (var k in cfg) d[k]=cfg[k]; return d; }

var FLEX_STOP = {" a":1," an":1," the":1," to":1," of":1," in":1," on":1," is":1," it":1," its":1,
    " you":1," your":1," i":1," and":1," or":1," so":1," be":1," as":1," at":1," if":1," im":1,
    " that":1," this":1," for":1," are":1," was":1," but":1," my":1," we":1," he":1," she":1};
var FLEX_EMOJI = {money:"$",cash:"$",dollar:"$",paid:"$",profit:"$",home:"home",house:"house",car:"car",cars:"car"};

// ---------- file parsing ----------
function flexRead(file){ file.open("r"); file.encoding="UTF-8"; var t=file.read(); file.close(); return t; }
function flexTc(tc){ tc=tc.replace(",","."); var p=tc.split(":"); return parseInt(p[0],10)*3600+parseInt(p[1],10)*60+parseFloat(p[2]); }
function flexParseSRT(txt){
    txt=txt.replace(/\r/g,""); var blocks=txt.split(/\n\n+/); var cues=[];
    for (var i=0;i<blocks.length;i++){
        var lines=blocks[i].split("\n"); if (lines.length<2) continue; var ln=0;
        if (/^\d+$/.test(lines[0].replace(/\s/g,""))) ln=1;
        var m=lines[ln].match(/(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[.,]\d{1,3})/);
        if (!m) continue;
        var text=lines.slice(ln+1).join(" ").replace(/<[^>]+>/g,"").replace(/\s+/g," ").replace(/^\s+|\s+$/g,"");
        if (text.length) cues.push({start:flexTc(m[1]),end:flexTc(m[2]),text:text});
    }
    return cues;
}
function flexParseJSON(txt){ var d; try{ d=eval("("+txt+")"); }catch(e){ return null; } if (!d||!d.words) return null; return d.words; }
function flexCuesToWords(cues){
    var words=[];
    for (var i=0;i<cues.length;i++){
        var ws=cues[i].text.split(/\s+/); var dur=Math.max(0.0001,cues[i].end-cues[i].start);
        var total=0, wl=[]; for (var j=0;j<ws.length;j++){ var L=ws[j].length+1; wl.push(L); total+=L; }
        var t=cues[i].start;
        for (var j=0;j<ws.length;j++){ var dd=dur*(wl[j]/total); words.push({w:ws[j],start:t,end:t+dd,cue:i}); t+=dd; }
    }
    return words;
}
function flexGroup(words,n,gap){
    var groups=[], cur=[]; gap=(gap==null)?0.45:gap;
    for (var i=0;i<words.length;i++){
        cur.push(words[i]);
        var hb=/[.!?]$/.test(words[i].w); var nx=words[i+1];
        var cc=nx&&(words[i].cue!=null)&&(nx.cue!=null)&&(nx.cue!==words[i].cue);
        var tg=nx&&((nx.start-words[i].end)>gap);
        if (cur.length>=n||hb||cc||tg){ groups.push(cur); cur=[]; }
    }
    if (cur.length) groups.push(cur);
    return groups;
}
function flexClean(w){ return w.toLowerCase().replace(/[^a-z0-9']/g,""); }
function flexKeyword(group){
    var best=-1,bs=-1;
    for (var i=0;i<group.length;i++){ var c=flexClean(group[i].w); if (c.length<3) continue; if (FLEX_STOP[" "+c]) continue;
        var sc=c.length+(/[0-9]/.test(c)?3:0); if (sc>bs){ bs=sc; best=i; } }
    if (best<0){ for (var i=0;i<group.length;i++) if (group[i].w.length>(best<0?0:group[best].w.length)) best=i; }
    return best;
}

// ---------- layer builders ----------
function flexFont(td, cfg){ try{ td.font=cfg.font; }catch(e){ try{ td.font=cfg.fontFallback; }catch(e2){} } }
function flexWordLayer(comp, text, size, cfg, isHi){
    var tl=comp.layers.addText(text); var tp=tl.property("Source Text"); var td=tp.value;
    td.resetCharStyle(); td.fontSize=size; flexFont(td,cfg);
    td.applyFill=true; td.fillColor=isHi?cfg.highlightColor:cfg.baseColor;
    if (cfg.strokeOn){ td.applyStroke=true; td.strokeColor=cfg.strokeColor; td.strokeWidth=cfg.strokeWidth; td.strokeOverFill=false; }
    td.justification=ParagraphJustification.CENTER_JUSTIFY; tp.setValue(td);
    tl.name="cap: "+text;
    if (cfg.shadow){ try{ var fx=tl.property("ADBE Effect Parade"); var sh=fx.addProperty("ADBE Drop Shadow");
        sh.property("Opacity").setValue(170); sh.property("Softness").setValue(30); sh.property("Distance").setValue(10); }catch(e){} }
    return tl;
}
function flexAnim(tl, atTime, cfg, scaleFit){
    var base=100*scaleFit, over=cfg.popScale*scaleFit;
    var scale=tl.property("Scale"), opa=tl.property("Opacity"), pos=tl.property("Position");
    var t0=atTime, d=cfg.animDur;
    if (cfg.anim==="none") return;
    opa.setValueAtTime(Math.max(0,t0-0.001),0); opa.setValueAtTime(t0+d*0.6,100);
    if (cfg.anim==="pop"||cfg.anim==="bounce"){
        scale.setValueAtTime(t0,[0,0]); scale.setValueAtTime(t0+d*0.55,[over,over]); scale.setValueAtTime(t0+d,[base,base]);
        if (cfg.anim==="bounce"){ scale.setValueAtTime(t0+d*1.35,[base*0.94,base*0.94]); scale.setValueAtTime(t0+d*1.7,[base,base]); }
        flexSmooth(scale);
    } else if (cfg.anim==="rise"){
        var p=pos.value; var rh=tl.sourceRectAtTime(atTime,false).height*0.4;
        pos.setValueAtTime(t0,[p[0],p[1]+rh]); pos.setValueAtTime(t0+d,[p[0],p[1]]); flexSmooth(pos); scale.setValue([base,base]);
    }
}
function flexSmooth(prop){
    try{ for (var i=1;i<=prop.numKeys;i++) prop.setInterpolationTypeAtKey(i, KeyframeInterpolationType.BEZIER, KeyframeInterpolationType.BEZIER);
        var n=prop.numKeys; if (n>=2){ var ei=new KeyframeEase(0,75);
            try{ prop.setTemporalEaseAtKey(n,[ei,ei,ei],[ei,ei,ei]); }catch(e){ try{ prop.setTemporalEaseAtKey(n,[ei],[ei]); }catch(e2){} } }
    }catch(e){}
}
function flexBox(comp, wordLayer, rect, cfg, size, cx, cy, scaleFit, wStart, gStart, gEnd, ctrl){
    var sh=comp.layers.addShape(); sh.name="box";
    var grp=sh.property("Contents").addProperty("ADBE Vector Group"); var cont=grp.property("Contents");
    var rp=cont.addProperty("ADBE Vector Shape - Rect");
    var padX=size*cfg.boxPadX, padY=size*cfg.boxPadY;
    rp.property("Size").setValue([rect.width+padX*2, rect.height+padY*2]);
    rp.property("Roundness").setValue(cfg.boxRound);
    var fill=cont.addProperty("ADBE Vector Graphic - Fill"); fill.property("Color").setValue(cfg.boxColor);
    sh.property("Anchor Point").setValue([0,0]); sh.property("Position").setValue([cx,cy]);
    if (scaleFit<1) sh.property("Scale").setValue([100*scaleFit,100*scaleFit]);
    sh.inPoint=Math.max(0,gStart); sh.outPoint=gEnd; flexAnim(sh,wStart,cfg,scaleFit);
    sh.parent=ctrl; sh.moveAfter(wordLayer); return sh;
}

// ---------- main build ----------
function flexBuild(comp, words, cfg){
    app.beginUndoGroup("FlexCaptions build");
    var W=comp.width, H=comp.height;
    var size=cfg.fontSize; if (cfg.autoScale) size=Math.round(cfg.fontSize*(H/2560));
    var yPos=H*(cfg.yPercent/100); var maxW=W*(cfg.maxWidthPercent/100);
    var groups=flexGroup(words,cfg.wordsPerGroup,cfg.gapBreak); var made=0;
    var ctrl=comp.layers.addNull(); ctrl.name="FlexCaptions_CTRL"; ctrl.enabled=false; ctrl.moveToBeginning();

    for (var g=0; g<groups.length; g++){
        var grp=groups[g];
        var kw=(cfg.highlightMode==="none")?-1:(cfg.highlightMode==="all")?999:
               (cfg.highlightMode==="rotate")?(g%grp.length):flexKeyword(grp);
        var gStart=grp[0].start, gEnd=grp[grp.length-1].end+cfg.holdPad;

        if (cfg.layout==="bigword"){
            var kidx=flexKeyword(grp); if (kidx<0) kidx=0;
            var smallSize=Math.round(size*0.46);
            var kLabel=cfg.upper?String(grp[kidx].w).toUpperCase():grp[kidx].w;
            var kLayer=flexWordLayer(comp,kLabel,size,cfg,true);
            var kr=kLayer.sourceRectAtTime(gStart,false);
            kLayer.property("Anchor Point").setValue([kr.left+kr.width/2, kr.top+kr.height/2]);
            kLayer.property("Position").setValue([W/2, yPos]);
            kLayer.inPoint=Math.max(0,gStart); kLayer.outPoint=gEnd; flexAnim(kLayer,grp[kidx].start,cfg,1); kLayer.parent=ctrl; made++;
            var cI=[]; for (var ci=0;ci<grp.length;ci++) if (ci!==kidx) cI.push(ci);
            if (cI.length){
                var cL=[], cWd=[], totalC=0, spaceC=smallSize*0.3;
                for (var cj=0;cj<cI.length;cj++){
                    var lb=cfg.upper?String(grp[cI[cj]].w).toUpperCase():grp[cI[cj]].w;
                    var cl=flexWordLayer(comp,lb,smallSize,cfg,false);
                    var rr=cl.sourceRectAtTime(gStart,false); cWd.push(rr.width); totalC+=rr.width; cL.push(cl);
                }
                totalC+=spaceC*(cI.length-1);
                var cCy=yPos - kr.height*0.5 - smallSize*0.55; var cx=(W-totalC)/2;
                for (var cj=0;cj<cL.length;cj++){
                    var cl2=cL[cj]; var rr2=cl2.sourceRectAtTime(gStart,false); var wpx=cWd[cj], ccx=cx+wpx/2;
                    cl2.property("Anchor Point").setValue([rr2.left+rr2.width/2, rr2.top+rr2.height/2]);
                    cl2.property("Position").setValue([ccx,cCy]);
                    cl2.inPoint=Math.max(0,gStart); cl2.outPoint=gEnd; flexAnim(cl2,grp[cI[cj]].start,cfg,1); cl2.parent=ctrl; made++;
                    cx+=wpx+spaceC;
                }
            }
            continue;
        }

        var tmp=[], widths=[], totalW=0, space=size*0.28;
        for (var i=0;i<grp.length;i++){
            var isHi=(kw===999)||(i===kw);
            var label=cfg.upper?String(grp[i].w).toUpperCase():grp[i].w;
            var tl=flexWordLayer(comp,label,size,cfg,isHi);
            var r=tl.sourceRectAtTime(gStart,false); widths.push(r.width); totalW+=r.width; tmp.push(tl);
        }
        totalW+=space*(grp.length-1);
        var scaleFit=1; if (totalW>maxW) scaleFit=maxW/totalW;
        var x=(W-totalW*scaleFit)/2;
        for (var i=0;i<grp.length;i++){
            var tl=tmp[i]; var r=tl.sourceRectAtTime(gStart,false); var wpx=widths[i]*scaleFit; var cx=x+wpx/2, cy=yPos;
            var isHi=(kw===999)||(i===kw);
            tl.property("Anchor Point").setValue([r.left+r.width/2, r.top+r.height/2]);
            tl.property("Position").setValue([cx,cy]);
            if (scaleFit<1) tl.property("Scale").setValue([100*scaleFit,100*scaleFit]);
            tl.inPoint=Math.max(0,gStart); tl.outPoint=gEnd;
            if (cfg.boxOn && (cfg.boxMode==="all" || (cfg.boxMode==="keyword" && isHi))){
                try{ flexBox(comp,tl,r,cfg,size,cx,cy,scaleFit,grp[i].start,gStart,gEnd,ctrl); }catch(eb){}
            }
            flexAnim(tl,grp[i].start,cfg,scaleFit); tl.parent=ctrl;
            x+=wpx+space*scaleFit; made++;
        }
    }
    app.endUndoGroup();
    return made;
}

// ---------- entry points called from the panel ----------
function flexWordsFromFile(f){
    var txt=flexRead(f);
    if (/\.json$/i.test(f.name)) return flexParseJSON(txt);
    return flexCuesToWords(flexParseSRT(txt));
}

function flexBuildFromFile(cfgJson){
    try{
        var comp=app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) return "ERR: Open/select a composition first.";
        var f=File.openDialog("Pick a .srt or .json subtitle file","*.srt;*.json;*.*");
        if (!f) return "ERR: No file chosen.";
        var cfg=flexMerge(eval("("+cfgJson+")"));
        var words=flexWordsFromFile(f);
        if (!words || !words.length) return "ERR: No words found in that file.";
        var n=flexBuild(comp,words,cfg);
        return "OK: Created "+n+" caption layers.";
    }catch(e){ return "ERR: "+e.toString()+(e.line?(" (line "+e.line+")"):""); }
}

// ---------- Premiere Pro: import SRT as a native caption track ----------
function flexPprImport(){
    try{
        if (typeof app==="undefined" || !app.project) return "ERR: Open a Premiere project first.";
        var f=File.openDialog("Pick a .srt caption file","*.srt;*.*");
        if (!f) return "ERR: No file chosen.";
        var ok=false;
        try{ ok=app.project.importFiles([f.fsName], true, app.project.rootItem, false); }
        catch(e1){ try{ ok=app.project.importFiles([f.fsName]); }catch(e2){ return "ERR: Import failed: "+e2.toString(); } }
        return "OK: Imported '"+f.name+"' into the Project panel. Drag it onto your sequence, then style it in the Captions panel. (Premiere captions are static; use After Effects for the animated look.)";
    }catch(e){ return "ERR: "+e.toString(); }
}

function flexOsWin(){ return $.os && $.os.toLowerCase().indexOf("windows")>=0; }
function flexActiveVideo(comp){
    var cand=[]; try{ var sl=comp.selectedLayers; for (var i=0;i<sl.length;i++) cand.push(sl[i]); }catch(e){}
    for (var i=1;i<=comp.numLayers;i++) cand.push(comp.layer(i));
    for (var i=0;i<cand.length;i++){ var L=cand[i];
        try{ if (L.source && L.source.mainSource && (L.source.mainSource instanceof FileSource)){ var f=L.source.mainSource.file; if (f && f.exists) return f; } }catch(e){} }
    return null;
}
// scriptsDir = folder holding transcribe.py (panel passes the extension's host path)
function flexAutoTranscribe(cfgJson, py, model, scriptsDir){
    try{
        var comp=app.project.activeItem;
        if (!(comp && comp instanceof CompItem)) return "ERR: Open/select a composition first.";
        var vid=flexActiveVideo(comp);
        if (!vid) return "ERR: No video/audio footage found in this comp.";
        var dir=new Folder(scriptsDir);
        var script=new File(dir.fsName+"/transcribe.py");
        if (!script.exists) return "ERR: transcribe.py not found in "+dir.fsName;
        var base=vid.fsName.replace(/\.[^.\/\\]+$/,"");
        var srt=new File(base+".srt"), js=new File(base+".json");
        var helper, cmd;
        if (flexOsWin()){
            helper=new File(dir.fsName+"/_run_transcribe.bat");
            helper.open("w"); helper.write('@echo off\r\n"'+(py||"python")+'" "'+script.fsName+'" "'+vid.fsName+'" --model '+(model||"small")+'\r\n'); helper.close();
            cmd='cmd.exe /c ""'+helper.fsName+'""';
        } else {
            helper=new File(dir.fsName+"/_run_transcribe.command");
            helper.open("w"); helper.write('#!/bin/sh\n"'+(py||"python3")+'" "'+script.fsName+'" "'+vid.fsName+'" --model '+(model||"small")+'\n'); helper.close();
            try{ system.callSystem('/bin/chmod +x "'+helper.fsName+'"'); }catch(e){}
            cmd='/bin/sh "'+helper.fsName+'"';
        }
        try{ system.callSystem(cmd); }catch(e){ return "ERR: Could not run Python. Run this manually: "+helper.fsName; }
        var use=srt.exists?srt:(js.exists?js:null);
        if (!use) return "ERR: No caption file produced. Run manually: "+helper.fsName;
        var cfg=flexMerge(eval("("+cfgJson+")"));
        var words=flexWordsFromFile(use);
        if (!words || !words.length) return "ERR: Transcribed but no words in "+use.name;
        var n=flexBuild(comp,words,cfg);
        return "OK: Auto-captioned. "+n+" layers from "+use.name;
    }catch(e){ return "ERR: "+e.toString(); }
}
