/**
 * OfficialStamp — renders a circular seal badge for VERIFIED / PENDING / REJECTED states.
 *
 * Props:
 *   status: 'verified' | 'pending' | 'rejected'
 *   small?: boolean
 */
export default function OfficialStamp({ status = 'pending', small = false }) {
  const config = {
    verified: { icon: '\u2714', label: 'Verified' },
    pending:  { icon: '\u25F7', label: 'Pending\nReview' },
    rejected: { icon: '\u2716', label: 'Rejected' },
  };

  const { icon, label } = config[status] || config.pending;

  return (
    <div className={`stamp ${status} ${small ? 'stamp-small' : ''}`}>
      <span className="stamp-icon">{icon}</span>
      <span className="stamp-label">{label}</span>
    </div>
  );
}
