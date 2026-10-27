//% color="#3b82f6" weight=100 icon="\uf108" block="MakerJr"
namespace makerjr {
    
    let isRunning = false;
    let currentLEDs = 0; 

    //% block="📡 Start Digital Twin"
    //% weight=100
    export function startTwin(): void {
        if (isRunning) return;
        isRunning = true;
        
        bluetooth.startUartService();

        // 1. THE SUPER PACKET TRANSMITTER (Runs 10x a second)
        control.inBackground(function () {
            while (true) {
                // Gather all onboard telemetry instantly
                let btnA = input.buttonIsPressed(Button.A) ? 1 : 0;
                let btnB = input.buttonIsPressed(Button.B) ? 1 : 0;
                let shake = input.isGesture(Gesture.Shake) ? 1 : 0;
                let pitch = input.rotation(Rotation.Pitch);
                let roll = input.rotation(Rotation.Roll);
                let compass = input.compassHeading();
                let temp = input.temperature();
                let light = input.lightLevel();
                let sound = input.soundLevel(); 

                // MakeCode-Safe string concatenation (No template literals)
                let packet = "TWIN:" + btnA + "," + btnB + "," + shake + "," + pitch + "," + roll + "," + compass + "," + temp + "," + light + "," + sound + "\n";
                bluetooth.uartWriteString(packet);
                
                basic.pause(100); 
            }
        });

        // 2. THE RECEIVER (Listens for Dashboard commands)
        bluetooth.onUartDataReceived("\n", function () {
            let cmd = bluetooth.uartReadUntil("\n");
            
            // MakeCode-Safe way to trim carriage returns from Bluetooth text
            let cleanCmd = "";
            for(let i = 0; i < cmd.length; i++) {
                if(cmd.charCodeAt(i) >= 32) {
                    cleanCmd += cmd.charAt(i);
                }
            }
            
            if (cleanCmd.charAt(0) === 'L') {
                // Receive Raw LED Grid
                currentLEDs = parseInt(cleanCmd.substr(2));
                redrawLEDs();
            } 
            else if (cleanCmd.charAt(0) === 'C') {
                // Clear Screen Command
                currentLEDs = 0;
                basic.clearScreen();
            } 
            else if (cleanCmd.charAt(0) === 'T') {
                // Scroll Text Command
                let msg = cleanCmd.substr(2);
                control.inBackground(function() {
                    basic.showString(msg);
                    basic.clearScreen();
                    redrawLEDs(); // Restore the drawing after text finishes
                });
            }
            else if (cleanCmd.charAt(0) === 'I') {
                // Show Built-In Icon Command
                let iconIdx = parseInt(cleanCmd.substr(2));
                if (iconIdx === 0) basic.showIcon(IconNames.Heart);
                else if (iconIdx === 1) basic.showIcon(IconNames.Happy);
                else if (iconIdx === 2) basic.showIcon(IconNames.Sad);
                else if (iconIdx === 3) basic.showIcon(IconNames.Ghost);
                else if (iconIdx === 4) basic.showIcon(IconNames.Skull);
                
                currentLEDs = 0; 
            }
            else if (cleanCmd.charAt(0) === 'M') {
                // Play Melody Command (Legacy Safe API)
                let melIdx = parseInt(cleanCmd.substr(2));
                if (melIdx === 0) music.startMelody(music.builtInMelody(Melodies.BaDing), MelodyOptions.OnceInBackground);
                else if (melIdx === 1) music.startMelody(music.builtInMelody(Melodies.PowerUp), MelodyOptions.OnceInBackground);
                else if (melIdx === 2) music.startMelody(music.builtInMelody(Melodies.PowerDown), MelodyOptions.OnceInBackground);
            }
        });
    }

    // Helper to decode the 25-bit integer into a 5x5 physical LED grid
    function redrawLEDs() {
        for(let i = 0; i < 25; i++) {
            let x = i % 5;
            let y = Math.floor(i / 5);
            if ((currentLEDs & (1 << i)) !== 0) {
                led.plot(x, y);
            } else {
                led.unplot(x, y);
            }
        }
    }
}
