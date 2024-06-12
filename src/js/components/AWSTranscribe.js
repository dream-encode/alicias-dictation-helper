import React, { useState, useEffect } from 'react'

function AWSTranscribe() {
	const [ isRecording, updateIsRecording ]         = useState( false )
	const [ transcribedData, updateTranscribedData ] = useState( '' )

	const startRecording = async () => {
		window.clearTranscription()

		updateIsRecording( true )

		try {
			const { startRecording } = await import( '../libs/transcribeClient.js' )

			await startRecording( transcriptionDataReceived )
		} catch (error) {
			alert( `An error occurred while recording: ${ error.message }` )

			await stopRecording()
		}
	}

	const transcriptionDataReceived = ( data ) => {
		updateTranscribedData( ( oldData ) => oldData + data )
	}

	const stopRecording = async () => {
		updateIsRecording( false )

		const { stopRecording } = await import( '../libs/transcribeClient.js' )

		stopRecording()
	}

	const sendEmail = async () => {
		const recipient = 'david@dream-encode.com'

		try {
			const { sendEmail } = await import( '../libs/emailClient.js' )

			await sendEmail( recipient, recipient, transcribedData )

			alert( 'Success! Email sent!' )
		} catch (error) {
			alert( `There was an error sending the email: ${ error }` )
		}
	}

	return (
		<div className="aws-transcribe">
			<h1>Alicia's Dictation Helper (Proof of Concept)</h1>
			<div id="recordButtonContainer">
				<button
					className={ `${ isRecording ? 'recording' : '' }` }
					disabled={ isRecording }
					onClick={ startRecording }
				>
					◉
				</button>
			</div>

			<div id="outputSection">
				<div id="headerText"><h2>Transcription</h2></div>
				<div id="transcribedText">{ transcribedData }</div>
			</div>
		</div>
	)
}

export default AWSTranscribe
