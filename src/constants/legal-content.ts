/**
 * In-app legal copy for Privacy Policy and Terms of Service.
 * Not legal advice — have qualified counsel review before App Store submission.
 * External URLs in legal-urls.ts remain required for the App Store listing.
 *
 * Content reflects code-audited Voxa 1.0 behaviour (free launch, no ads / IAP).
 */

export const LEGAL_LAST_UPDATED = '6 September 2026';

export const PRIVACY_POLICY_SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: 'Who operates Voxa',
    body: 'Voxa is a personal AI companion app for conversation, reflection, planning, goals, routines, reminders, memories, personalisation, and Journey features. This Privacy Policy describes what information is processed when you use Voxa, why it is processed, and the choices available to you. Voxa 1.0 is operated by an individual in the United Kingdom; a separate incorporated Voxa company has not been formed for this release. Privacy and support contact: mujimoh2008@gmail.com. You can also use You → Contact support in the app.',
  },
  {
    title: 'Information you provide',
    body: 'Depending on how you use Voxa, you may provide: account credentials and email address (if you create an account), display name and profile or companion preferences, onboarding answers, chat messages (Talk conversations), memories you create or ask Voxa to keep, notes and journal or reflection content, goals and reminders, routine and check-in information, optional faith or values content if you enable that feature, optional nutrition entries if you use calorie tracking, photos or media you attach in chat, and support messages you send us.',
  },
  {
    title: 'Information collected automatically',
    body: 'When you use Voxa, we may process: authentication identifiers and session tokens stored on your device, app version and basic technical data needed to operate the service, optional device location or a city you choose manually for weather, usage metadata such as AI request counts and token totals when cloud sync and the AI gateway are enabled, and locally scheduled notification preferences (for example daily check-ins, routines, or reminders you enable). Voxa 1.0 does not use third-party advertising networks, does not show ads, and does not sell your conversations.',
  },
  {
    title: 'AI conversation processing',
    body: 'When you chat with Voxa, relevant messages and selected context (such as memories, notes, goals, mood summaries, or weather context you allow) may be sent through our server-side AI gateway to AI service providers to generate replies. In the current V1 configuration, chat generation is provided by OpenAI when the gateway is configured. The iOS app does not embed a production OpenAI API key for Talk. AI output can be inaccurate or incomplete. Do not share information you are not comfortable processing with AI systems. Voxa is instructed not to invent weather, calendar events, calorie logs, or memories.',
  },
  {
    title: 'Memory functionality',
    body: 'Voxa can store memories you create or ask it to remember. You can review, pin, edit, or delete individual memories in the app. You can turn memory features off in Settings. Memories may be stored on your device and, when cloud sign-in is enabled, synced to your account in cloud storage.',
  },
  {
    title: 'Local vs cloud storage',
    body: 'Some Voxa data stays on your device only (for example notes, mood journal entries, daily reflections, routines, and nutrition logs in the current version). If you sign in with cloud sync enabled, account-linked data such as profile information, chat messages, memories, goals, and reminders may be stored on secure cloud infrastructure operated by our service providers (including Supabase for authentication, database, and file storage). Data may also be cached on your device for speed and offline use. Settings shows whether your data uses cloud sync or stays on this device.',
  },
  {
    title: 'Photos and attachments',
    body: 'If you capture or attach photos in chat, image files may be uploaded to cloud storage associated with your account when cloud sync is enabled. Attachment metadata may be stored with your messages.',
  },
  {
    title: 'Voice and spoken replies',
    body: 'Optional spoken replies may use on-device text-to-speech or, if configured in a given build, a speech synthesis provider. Live voice calls and microphone-based chat are disabled in the current App Store release unless explicitly enabled in a future update. Microphone access is not required for standard text chat or spoken replies.',
  },
  {
    title: 'Location and weather',
    body: 'Location is optional. You may allow device location, choose a city manually, or skip weather features. When enabled, approximate coordinates or your chosen city are used to fetch forecasts from a weather data provider (Open-Meteo by default, or a configured proxy). Location is not required for chat.',
  },
  {
    title: 'Notifications',
    body: 'If you enable notifications, Voxa schedules local reminders and check-ins on your device (for example daily check-ins, routines, or goal-linked reminders). Notification content is generated and delivered locally; Voxa does not require a push-notification marketing network for these reminders. You can change notification preferences in the app and in iOS Settings.',
  },
  {
    title: 'Third-party service providers',
    body: 'We use service providers to operate Voxa, including: Supabase (authentication, database, and file storage when cloud sync is enabled; server-side functions including the AI gateway and account deletion); OpenAI (chat generation via our server-side AI gateway when configured); Open-Meteo or a configured weather proxy for forecasts; Apple (App Store distribution and local notifications); Expo/EAS (app build and updates infrastructure). Voxa 1.0 is completely free — no subscriptions, ads, paid upgrades, or in-app purchases are offered in this release. These providers process data on our behalf to deliver the service.',
  },
  {
    title: 'Why we process information',
    body: 'We process information to: provide and personalise the companion experience; remember what you ask us to remember; sync your account when cloud sign-in is enabled; deliver optional features you turn on; operate notifications you request; protect against abuse; and keep the service working reliably.',
  },
  {
    title: 'Sharing and disclosure',
    body: 'We do not sell your personal conversations. We share information with service providers who help us operate Voxa, when required by law, to protect rights and safety, or in connection with a merger or acquisition with appropriate safeguards. AI providers receive the message and context needed to generate replies; they do not receive your data for their own advertising.',
  },
  {
    title: 'Retention',
    body: 'We retain information for as long as your account is active or as needed to provide the service, comply with legal obligations, resolve disputes, and enforce our terms. Cached data on your device persists until you delete it, sign out with local cleanup, or delete your account.',
  },
  {
    title: 'Your choices and rights',
    body: 'You can review memories, export some of your data, delete individual memories, control optional permissions in iOS Settings, and request account deletion from You → Privacy & data. Where applicable under privacy laws such as UK GDPR, you may request access, correction, or deletion by contacting mujimoh2008@gmail.com. You may complain to your local supervisory authority where applicable.',
  },
  {
    title: 'Account deletion',
    body: 'You may delete your account from You → Privacy & data → Delete account. When cloud sync is enabled and you are signed in, this requests deletion of your authentication account and associated cloud records (including profile, conversations, messages, chat attachments, memories, goals, and reminders) through our deletion service, then clears local app data on your device. If the deletion request fails (for example due to a network error), your account is not deleted and you can try again. Deletion is permanent and cannot be undone once it succeeds. Some provider-side processing logs may persist for a limited period as described by those providers.',
  },
  {
    title: 'Security',
    body: 'We use reasonable technical and organisational measures to protect information, including secure token storage on supported devices and access controls on cloud infrastructure. No method of transmission or storage is completely secure.',
  },
  {
    title: 'International processing',
    body: 'Your information may be processed in countries where we or our service providers operate, including the United States and the European Economic Area depending on provider configuration. Those countries may have different data protection laws than your own.',
  },
  {
    title: "Children's privacy",
    body: 'Voxa is not directed at children under 13 (or the minimum age required in your region). Do not create an account for a child below that age.',
  },
  {
    title: 'Changes to this policy',
    body: 'We may update this Privacy Policy from time to time. Material changes will be reflected in-app and on our public policy page with a revised effective date.',
  },
  {
    title: 'Contact',
    body: 'Privacy questions or requests: mujimoh2008@gmail.com, or You → Contact support in the app.',
  },
];

export const TERMS_OF_SERVICE_SECTIONS: Array<{ title: string; body: string }> = [
  {
    title: 'Agreement',
    body: 'By downloading, accessing, or using Voxa, you agree to these Terms of Service and our Privacy Policy. If you do not agree, do not use the app.',
  },
  {
    title: 'Eligibility',
    body: 'You must be at least 13 years old (or the minimum age required in your country) and able to form a binding contract. If you use Voxa on behalf of an organisation, you represent that you have authority to bind that organisation.',
  },
  {
    title: 'The service',
    body: 'Voxa is a personal AI companion iOS app for conversation, reflection, planning, goals, routines, reminders, memories, personalisation, Journey features, optional weather, optional nutrition tracking, notes, and local social games. Voxa is not therapy, medical advice, emergency support, a human, or an autonomous professional adviser. Features may change, be added, or be removed as we improve the product.',
  },
  {
    title: 'Your account',
    body: 'You are responsible for activity on your account and for keeping your sign-in credentials secure. Provide accurate information where requested. You may delete your account at any time from You → Privacy & data → Delete account.',
  },
  {
    title: 'Acceptable use',
    body: 'You agree not to misuse Voxa, attempt to extract secrets or bypass security, interfere with the service, harass others, upload unlawful content, or use Voxa for illegal activity. We may suspend or terminate access for violations or to protect the service.',
  },
  {
    title: 'AI-generated information',
    body: 'Voxa uses artificial intelligence to generate responses. AI output may be wrong, incomplete, outdated, or inappropriate. You are responsible for how you use AI output and should verify important facts independently. We do not guarantee that AI output is always correct.',
  },
  {
    title: 'AI limitations and no professional advice',
    body: 'Voxa is an AI companion. It is not a licensed doctor, therapist, lawyer, financial adviser, or emergency service. Nutrition, wellbeing, and reflection tools are general aids, not clinical care. Voxa does not guarantee outcomes. If you are in danger or crisis, contact local emergency services or a trusted helpline immediately.',
  },
  {
    title: 'Your content',
    body: 'You retain ownership of content you create. You grant us a limited licence to host, process, store, and transmit your content solely to operate, secure, and improve Voxa as described in our Privacy Policy.',
  },
  {
    title: 'Intellectual property',
    body: 'The Voxa app, branding, and original materials belong to the operator and its licensors. These Terms do not grant you ownership of our intellectual property.',
  },
  {
    title: 'Free V1 release',
    body: 'The current Voxa 1.0 App Store release is completely free. There are no subscriptions, ads, paid upgrades, or in-app purchases in this version.',
  },
  {
    title: 'Availability and changes',
    body: 'We aim for reliable service but do not guarantee uninterrupted availability. Maintenance, updates, third-party outages, or device compatibility issues may affect the app. We may modify or discontinue features with reasonable notice where practicable.',
  },
  {
    title: 'Termination',
    body: 'You may stop using Voxa at any time and may delete your account from You → Privacy & data → Delete account. We may suspend or terminate access if you breach these Terms, if required for security or legal reasons, or if we discontinue the service.',
  },
  {
    title: 'Disclaimers',
    body: 'Voxa is provided “as is” and “as available” to the fullest extent permitted by applicable law. We disclaim warranties of merchantability, fitness for a particular purpose, and non-infringement where allowed.',
  },
  {
    title: 'Limitation of liability',
    body: 'To the fullest extent permitted by applicable law, the operator will not be liable for indirect, incidental, special, consequential, or punitive damages, or for loss of profits, data, or goodwill arising from your use of Voxa. Nothing in these Terms limits liability that cannot be limited under applicable law (including for death or personal injury caused by negligence, or fraud).',
  },
  {
    title: 'Governing law',
    body: 'These Terms are governed by the laws of England and Wales. Voxa 1.0 is operated by an individual in the United Kingdom; a separate incorporated Voxa company has not been formed for this release. Contact: mujimoh2008@gmail.com. If you are a consumer, you may retain mandatory rights under the laws of your country of residence.',
  },
  {
    title: 'Changes to these Terms',
    body: 'We may update these Terms from time to time. Continued use after the effective date of updated Terms constitutes acceptance where permitted by law. Material changes will be reflected in-app and on our public terms page.',
  },
  {
    title: 'Contact',
    body: 'Questions about these Terms: mujimoh2008@gmail.com, or You → Contact support in the app.',
  },
];

/** Reject developer-only placeholder phrases in production legal screens. */
export function containsLegalPlaceholderCopy(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('before app store') ||
    lower.includes('must be finalised') ||
    lower.includes('must be finalized') ||
    lower.includes('replace with your live support') ||
    lower.includes('host a public url before') ||
    lower.includes('[required before publishing]') ||
    lower.includes('voxa.app')
  );
}
