import { PassportCheckinRedeemer } from './passport-checkin-redeemer';
export default async function PassportCheckinPage({ params }: { params: Promise<{ token: string }> }) { return <PassportCheckinRedeemer token={(await params).token} />; }
