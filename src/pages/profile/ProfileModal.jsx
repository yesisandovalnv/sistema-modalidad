import { CenteredModal } from '../../components/ui/CenteredModal'
import { useAuth } from '../../hooks/useAuth'
import { ProfileContent } from './ProfileContent'

export function ProfileModal({ onClose }) {
  const { user } = useAuth()
  return (
    <CenteredModal title="Mi perfil" eyebrow="Cuenta personal" onClose={onClose} size="lg" labelledBy="profile-modal-title">
      <ProfileContent user={user} />
    </CenteredModal>
  )
}
