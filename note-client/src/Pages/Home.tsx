import AuthenticatedHome from "../Components/Home/AuthenticatedHome"
import Navbar from "../Components/Navbar/Navbar"

function Home() {
  return (
    <div>
        <Navbar />
        <AuthenticatedHome/>
    </div>
  )
}

export default Home