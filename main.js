let client = AgoraRTC.createClient({mode: 'rtc', 'codec': "vp8"})

let config = {
    appid: '26c0963a341c43b5b3d9d7d452689cc6',
    token: '00626c0963a341c43b5b3d9d7d452689cc6IABW9gDFiASFE6xLcjh6oVENxwY0wMajbA8/5j76NNbC5nTFnEwAAAAAEAClV51HBIgfYgEAAQAEiB9i',
    uid: null,
    channel: 'videochatApp'
}

let audioTracks = []

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
    delete remoteTracks[user.uid]
    document.getElementById(`video-wrapper-${user.uid}`)
} 


let joinStreams = async () => {

    client.on("user-published", handleUserJoined);
    client.on("user-left", handleUserLeft);
    // client.on("user-published", handleUserJoined)
    // client.on("user-left", handleUserLeft)

    [config.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
        client.join(config.appid, config.channel, config.token ||null, config.uid ||null),
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack(),
    ])

    let videoPlayer = `
        <div class="video-container" id="video-wrapper-${config.uid}">
            <p class="user-uid">${config.uid}</p>
            <div class="video-player player" id="stream-${config.uid}">
        </div>
    `;
    document.getElementById('user-streams').insertAdjacentHTML('beforeend', videoPlayer)

    localTracks.videoTrack.play(`stream-${config.uid}`)

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
            </div>
        `;
    
        document.getElementById('user-streams').insertAdjacentHTML('beforeend', videoPlayer)
        user.videoTrack.play(`stream-${user.uid}`)
    }

    if(mediaType === 'audio') {
        user.audioTrack.play();
        audioTracks.push(user.audioTrack.getMediaStreamTrack());
    }

}



document.getElementById('startRecord').addEventListener('click', () => {
    startRecord.style.display = 'none';
    stopRecord.style.display = 'block'
    startRecording()
})

document.getElementById('stopRecord').addEventListener('click', () => {
    stopRecord.style.display = 'none'
    startRecord.style.display = 'block';
    mediaRecorder.stop();
})


var mediaRecorder;
var chunks = [];
// async function captureScreen(mediaContraints = {
//     video: true
// }) {
//     const screenStream = await navigator.mediaDevices.getDisplayMedia(mediaContraints)
//     return screenStream
// }

async function captureAudio(mediaContraints = {
    video: false,
    audio: true
}) {
    const audioStream = await navigator.mediaDevices.getUserMedia(mediaContraints)
    return audioStream
}

async function startRecording() {
    // const screenStream = await captureScreen();
    const audioStream = await captureAudio();

    //MediaStream
    const stream =new MultiStreamRecorder([
        // ...screenStream.getTracks(),
        audioTracks,
        audioStream.getTracks()
    ])
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    mediaRecorder.onstop = function(e) {
        var clipName = prompt("Enter a name for your recording")
        stream.getTracks().forEach((track) => track.stop());
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
    }
    mediaRecorder.ondataavailable = function(e) {
        chunks.push(e.data)
    }
}
