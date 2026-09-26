# Member Photo Storage Audit

Generated: 2026-09-25 19:48:32 +05:00

WARNING - api.ts still targets bucket: client-photos
WARNING - api.ts calls getPublicUrl(); this is not valid retrieval for a private bucket.

Pack 3 storage design:
- private bucket: client-photos-private
- bucket is private
- storage policy expects the first path folder to be the gym UUID

Current stabilization behavior:
- member save continues if photo upload fails
- existing photo is preserved on edit when possible
- no public bucket is created
- no storage security policy is weakened

Required dedicated follow-up:
- persist clients.photo_path
- upload to client-photos-private using gym UUID as the first folder
- resolve private photos via authenticated download or short-lived signed URLs
- refresh signed URLs when member records are loaded
- migrate any existing public URLs without breaking old records
