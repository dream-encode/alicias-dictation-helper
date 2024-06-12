import { SESClient } from '@aws-sdk/client-ses'
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity'
import { SendEmailCommand } from '@aws-sdk/client-ses'

import {
	AWS_REGION,
	AWS_IDENTITY_POOL_ID
} from '../inc/constants'

export const sendEmail = async ( sender, receiver, originalText ) => {
	const sesClient = createSESClient()
	const htmlBody  = createHTMLBody( originalText )
	const textBody  = createTextBody( originalText )
	const command   = createEmailCommand(sender, receiver, htmlBody, textBody )

	await sesClient.send( new SendEmailCommand( command ) )
}

const createSESClient = () => {
	return new SESClient( {
		region: AWS_REGION,
		credentials: fromCognitoIdentityPool( {
			client: new CognitoIdentityClient( { region: AWS_REGION } ),
			identityPoolId: AWS_IDENTITY_POOL_ID,
		} ),
	} )
}

const createHTMLBody = ( originalText ) => {
	return {
		Charset: 'UTF-8',
		Data:`
		<h1>Hello!</h1>
		<p>Here is your Amazon Transcribe recording:</p>
		<h1>Original</h1>
		<p>${ originalText }</p>
		`
	}
}

const createTextBody = ( originalText ) => {
	return {
		Charset: 'UTF-8',
		Data:
		"Hello,\\r\\n" +
		"Here is your Amazon Transcribe transcription:" +
		"\n" +
		originalText,
	}
}

const createEmailCommand = ( sender, receiver, htmlBody, textBody ) => {
	return {
		Destination: {
			CcAddresses: [],
			ToAddresses: [
				receiver
			],
		},
		Message: {
			Body: {
				Html: htmlBody,
				Text: textBody,
			},
			Subject: {
				Charset: 'UTF-8',
				Data: 'Your Amazon Transcribe transcription.',
			},
		},
		Source: sender,
	}
}