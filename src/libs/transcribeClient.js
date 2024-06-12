import MicrophoneStream from 'microphone-stream'

import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity'
import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from '@aws-sdk/client-transcribe-streaming'

import {
	AWS_REGION,
	AWS_IDENTITY_POOL_ID
} from '../inc/constants'

const MicrophoneStreamImpl = MicrophoneStream.default

const SAMPLE_RATE = 44100

let microphoneStream = undefined

let transcribeClient = undefined

export const startRecording = async ( callback ) => {
	if ( microphoneStream || transcribeClient ) {
		stopRecording()
	}

	createTranscribeClient()
	createMicrophoneStream()

	await startStreaming( callback )
}

export const stopRecording = function () {
	if ( microphoneStream ) {
		microphoneStream.stop()
		microphoneStream.destroy()
		microphoneStream = undefined
	}

	if ( transcribeClient ) {
		transcribeClient.destroy()
		transcribeClient = undefined
	}
}

const createTranscribeClient = () => {
	transcribeClient = new TranscribeStreamingClient( {
		region: AWS_REGION,
		credentials: fromCognitoIdentityPool( {
			client: new CognitoIdentityClient( { region: AWS_REGION } ),
			identityPoolId: AWS_IDENTITY_POOL_ID,
		} ),
	} )
}

const createMicrophoneStream = async () => {
	microphoneStream = new MicrophoneStreamImpl()

	microphoneStream.setStream(
		await window.navigator.mediaDevices.getUserMedia( {
			video: false,
			audio: true,
		} ),
	)
}

const startStreaming = async ( callback ) => {
	const command = new StartStreamTranscriptionCommand( {
		LanguageCode: 'en',
		MediaEncoding: 'pcm',
		MediaSampleRateHertz: SAMPLE_RATE,
		AudioStream: getAudioStream(),
	} )

	const data = await transcribeClient.send( command )

	for await ( const event of data.TranscriptResultStream ) {
		for ( const result of event.TranscriptEvent.Transcript.Results || [] ) {
			if ( result.IsPartial === false ) {
				const noOfResults = result.Alternatives[0].Items.length

				for ( let i = 0; i < noOfResults; i++ ) {
					console.log( result.Alternatives[0].Items[ i ].Content )

					callback( result.Alternatives[0].Items[ i ].Content + ' ' )
				}
			}
		}
	}
}

const getAudioStream = async function* () {
	if ( ! microphoneStream ) {
		throw new Error(
			'Cannot get audio stream. microphoneStream is not initialized.',
		)
	}

	for await ( const chunk of microphoneStream ) {
		if ( chunk.length <= SAMPLE_RATE ) {
			yield {
				AudioEvent: {
					AudioChunk: encodePCMChunk( chunk ),
				},
			}
		}
	}
}

const encodePCMChunk = ( chunk ) => {
	const input = MicrophoneStreamImpl.toRaw( chunk )

	let offset = 0

	const buffer = new ArrayBuffer( input.length * 2 )
	const view   = new DataView( buffer )

	for ( let i = 0; i < input.length; i++, offset += 2 ) {
		let s = Math.max( -1, Math.min( 1, input[ i ] ) )

		view.setInt16( offset, ( s < 0 ) ? s * 0x8000 : s * 0x7fff, true )
	}

	return Buffer.from( buffer )
}