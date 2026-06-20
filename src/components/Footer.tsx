import { LogoLockup } from './Logo'
import { RouterLink } from './primitives'
import IconFacebook from './icons/Facebook'
import IconInstagram from './icons/Instagram'
import IconWhatsapp from './icons/Whatsapp'

interface FooterLinkItem {
  label: string
  href: string
}

interface FooterColumn {
  title: string
  links: FooterLinkItem[]
}

const footerColumns: FooterColumn[] = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', href: '/products' },
    ],
  },
  {
    title: 'Developed by',
    links: [
      {
        label: "Yousef Adel",
        href: "https://www.linkedin.com/in/yousef-adel00/"
      },
      {
        label: "Mohamed Safwat",
        href: "https://www.linkedin.com/in/mohamed-safwat-169968314/"
      }
    ]
  }
]

const socialMedia = [
  {
    name: 'Instagram',
    icon: <IconInstagram size="16px" />,
    url: "#",
  },
  {
    name: 'Facebook',
    icon: <IconFacebook size="16px" />,
    url: "#",
  },
  {
    name: 'Whatsapp',
    icon: <IconWhatsapp size="16px" />,
    url: "#",
  }
]

const linkClass =
  'font-mono text-sm text-cream opacity-60 transition-opacity duration-300 cursor-pointer hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold'

export function Footer() {
  return (
    <footer id="about" className="bg-obsidian px-6 py-section md:px-10 lg:py-section-lg">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-12 md:grid-cols-2 md:gap-12">
        <div className="flex flex-col items-start gap-4">
          <LogoLockup className="items-start" starClassName="h-7" wordmarkClassName="text-wordmark" />
          <p className="max-w-xs text-start font-mono text-sm leading-relaxed text-pretty text-cream md:text-base">
            Essential forms engineered to outlive the trend cycle.
          </p>
          <hr className="w-1/12 border border-gold" />
          <ul className="flex flex-row gap-6">
            {socialMedia.map((item) => (
              <li key={`socialmedia-${item.name.toLowerCase()}`}>
                <a
                  href={item.url}
                  className={`flex flex-row items-center justify-center gap-2 ${linkClass}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.icon} {item.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {footerColumns.map((column) => (
          <div key={column.title}>
            <h3 className="mb-4 font-mono text-nav uppercase tracking-widest text-gold">
              {column.title}
            </h3>
            <ul className="flex flex-col gap-3">
              {column.links.map((link) => (
                <li key={link.href + link.label}>
                  <RouterLink to={link.href} className={linkClass}>
                    {link.label}
                  </RouterLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
