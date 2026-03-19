import { Navigate } from "react-router-dom"

export default function AuthGuard({ roles, children }) {
  const stored = localStorage.getItem("transitos_role")
  if (!roles.includes(stored)) return <Navigate to="/" replace />
  return children
}