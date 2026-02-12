import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-background border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-6 md:py-8">
          <div className="flex items-center space-x-4">
            <Link to="/" className="flex items-center space-x-2">
              <img
                src="/HB_LOGO.svg"
                alt="HalalBytes Logo"
                className="h-8 w-auto"
              />
              <span className="font-bold text-lg">HalalBytes</span>
            </Link>
          </div>
          <div className="text-center text-sm text-muted-foreground mt-4 md:mt-0">
            © {new Date().getFullYear()} HalalBytes. Made with ❤️ for the
            Muslim community.
          </div>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <Link
              to="/about"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              to="/submit-restaurant"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Submit
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
