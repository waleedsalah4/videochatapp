


let client = AgoraRTC.createClient({mode: 'rtc', 'codec': "vp8"})

let config = {
    appid: '26c0963a341c43b5b3d9d7d452689cc6',
    token: '00626c0963a341c43b5b3d9d7d452689cc6IABsL+s1U9qsWGArLwAnRIK3ICRGhuTU4FbsF3IO56WoJ3TFnEwAAAAAEABD/MfD4JRuYgEAAQDflG5i',
    uid: null,
    channel: 'videochatApp'
}

// for record
let audioTracks = []
let recording = false;

let ac = new AudioContext();
let ctx = new AudioContext();
let sources=[];

let dest ;
//******************** */

/**audio visaulizer */
function audioVisualizers(audioSource, id){
    //num of bars to display  audio
    const NBR_OF_BARS = 50;
    
    // const ctx = new AudioContext();

    // Create an audio source
    // const audioSource = ctx.createMediaStreamSource(audio);

    // Create an audio analyzer
    const analayzer = ctx.createAnalyser();

    // Connect the source, to the analyzer, and then back the the context's destination
    audioSource.connect(analayzer);
    audioSource.connect(ctx.destination);

    // Print the analyze frequencies
    const frequencyData = new Uint8Array(analayzer.frequencyBinCount);
    analayzer.getByteFrequencyData(frequencyData);
    console.log("frequencyData", frequencyData);


    const visualizerContainer = document.querySelector(`#visualizer-container-${id}`)

    for (let i=0; i < NBR_OF_BARS; i++ ){
        const bar = document.createElement("div")
        bar.setAttribute("id", "bar" + i);
        bar.setAttribute('class', "visualizer-container__bar")
        visualizerContainer.appendChild(bar)
    }

    //This function has the task to adjust the bar heights according to the frequency data
    function renderFrame(){
        // Update our frequency data array with the latest frequency data
        analayzer.getByteFrequencyData(frequencyData)

        for (let i=0; i < NBR_OF_BARS; i++ ){

            const index = (i+10)*2;
            const fd = frequencyData[index]
            const bar = document.querySelector("#bar" + i);
            if(!bar){
                continue;
            }
            const barHeight = Math.max(4, fd || 0);
            bar.style.height = barHeight + "px"
        }

        window.requestAnimationFrame(renderFrame)
    }
    renderFrame()

    // setInterval(function(){
    //     renderFrame();
    // }, 1000)
}



let localTracks= {
    audioTrack: null,
    videoTrack: null
}

let localTrackState = {
    audioTrackMuted: false,
    videoTrackMuted: false
}

let remoteTracks = {}

document.getElementById('join-btn').addEventListener('click', async() =>{
    console.log('user joined')
    await joinStreams();
    document.getElementById('join-btn').style.display = 'none'
    document.getElementById('footer').style.display = 'flex'
})

document.getElementById('mic-btn').addEventListener('click', async () => {
    if(!localTrackState.audioTrackMuted){
        await localTracks.audioTrack.setMuted(true)
        localTrackState.audioTrackMuted = true
        document.getElementById('mic-btn').style.backgroundColor= 'rgb(255,80,80,0.7)'
    } else {
        await localTracks.audioTrack.setMuted(false)
        localTrackState.audioTrackMuted = false
        document.getElementById('mic-btn').style.backgroundColor= '#1f1f1f8e'
    }
})

document.getElementById('camera-btn').addEventListener('click', async () => {
    if(!localTrackState.videoTrackMuted){ 
        await localTracks.videoTrack.setMuted(true)
        localTrackState.videoTrackMuted = true
        document.getElementById('camera-btn').style.backgroundColor= 'rgb(255,80,80,0.7)'
    } else {
        await localTracks.videoTrack.setMuted(false)
        localTrackState.videoTrackMuted = false
        document.getElementById('camera-btn').style.backgroundColor= '#1f1f1f8e'
    }
})

document.getElementById('leave-btn').addEventListener('click',  async () => {
    for(trackName in localTracks) {
        let track = localTracks[trackName]
        if(track) {
            //stop camera and mic
            track.stop()

            //disconnects from camera and mic
            track.close()
            localTracks[trackName] = null
        }
    }

    await client.leave();
    document.getElementById('user-streams').innerHTML = ''
    document.getElementById('footer').style.display = 'none'
    document.getElementById('join-btn').style.display = 'block'

})

let handleUserLeft = async (user) => {
    audioTracks=audioTracks.filter(audioTrack => audioTrack.uid !== user.uid)
    console.log('from user left==============>' ,audioTracks)
    delete remoteTracks[user.uid]

    document.getElementById(`video-wrapper-${user.uid}`)
} 


let joinStreams = async () => {

    client.on("user-published", handleUserJoined);
    client.on("user-left", handleUserLeft);

    [config.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
        client.join(config.appid, config.channel, config.token ||null, config.uid ||null),
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack(),
    ])

    let videoPlayer = `
        <div class="video-container" id="video-wrapper-${config.uid}">
            <p class="user-uid">${config.uid}</p>
            <div class="video-player player" id="stream-${config.uid}">
            <div class="visualizer-container" id="visualizer-container-${config.uid}"></div>
        </div>
    `;
    document.getElementById('user-streams').insertAdjacentHTML('beforeend', videoPlayer)

    localTracks.videoTrack.play(`stream-${config.uid}`)
    audioTracks.push(localTracks.audioTrack.getMediaStreamTrack())
    if (ac.state === 'suspended') {
        ac.resume();
    }
    // ac =new AudioContext()
    // ac.createMediaStreamDestination();
    // sources.push(ac.createMediaStreamSource(new MediaStream([localTracks.audioTrack.getMediaStreamTrack()])))

    //--------- for audio visualizer ------
    
    // let newMediaStram = new MediaStream(localTracks.audioTrack.getMediaStreamTrack())
    audioVisualizers(ctx.createMediaStreamSource(new MediaStream([localTracks.audioTrack.getMediaStreamTrack()])), config.uid)
    
    //-----------------------------------------------------------

    console.log("printing audio tracks from local user ===============================================================>", audioTracks)
    await client.publish([localTracks.audioTrack, localTracks.videoTrack])
    
}






let handleUserJoined = async(user, mediaType) => {
    console.log('user has join our stream')
    remoteTracks[user.uid] = user

    await client.subscribe(user, mediaType)

    let videoPlayer = document.getElementById(`"video-wrapper-${user.uid}`)
    if(videoPlayer !== null){
        videoPlayer.remove()
    }
    if(mediaType === 'video') {
        let videoPlayer = `
            <div class="video-container" id="video-wrapper-${user.uid}">
                <p class="user-uid">${user.uid}</p>
                <div class="video-player player" id="stream-${user.uid}">
                <div class="visualizer-container" id="visualizer-container-${user.uid}"></div>
            </div>
        `;
    
        document.getElementById('user-streams').insertAdjacentHTML('beforeend', videoPlayer)
        user.videoTrack.play(`stream-${user.uid}`)
    }

    if(mediaType === 'audio') {
        user.audioTrack.play();
        
        // audioVisualizers(ctx.createMediaStreamSource(new MediaStream([user.audioTrack.getMediaStreamTrack()])), user.uid)
        
        if(recording){
            sources.push(ac.createMediaStreamSource(new MediaStream([user.audioTrack.getMediaStreamTrack()])))
            sources[sources.length-1].connect(dest)
        } else{
            audioTracks.push(user.audioTrack.getMediaStreamTrack());
        }


        // console.log("printing audio tracks from user joined ================================================>", audioTracks)
    }

}

let recorder;

document.getElementById('startRecord').addEventListener('click', () => {
    startRecord.style.display = 'none';
    stopRecord.style.display = 'block'
    startRecording()
})

document.getElementById('stopRecord').addEventListener('click', () => {
    stopRecord.style.display = 'none'
    startRecord.style.display = 'block';
    recorder.stop();
})



let chunks = [];

function startRecording(){
    recording = true
// WebAudio MediaStream sources only use the first track.
    console.log('AudioTracks ======>',audioTracks)

    // The destination will output one track of mixed audio.
    dest = ac.createMediaStreamDestination();

    sources = audioTracks.map(t => ac.createMediaStreamSource(new MediaStream([t])));
    // Mixing
    sources.forEach(s => s.connect(dest));

    // Record 10s of mixed audio as an example
    recorder = new MediaRecorder(dest.stream);
    recorder.start();
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
        var clipName = prompt("Enter a name for your recording")
        const blob = new Blob(chunks, {
            type: 'video/mp4'
        })
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none"
        a.href = url;
        a.download = clipName +".mp4"
        document.body.appendChild(a)
        a.click();
        setTimeout(()=>{
            document.body.removeChild(a)
            window.URL.revokeObjectURL(url)
        }, 100)
    };
    // setTimeout(() => recorder.stop(), 10000);
}


