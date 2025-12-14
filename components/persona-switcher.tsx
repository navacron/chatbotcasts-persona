import { useUser } from "@clerk/nextjs"

interface PersonaSwitcherProps {
  personas: string[]
  selected: string | null
  onSelect: (persona: string) => void
  personaDetails: any
}

const HUMAN_PERSONA_ID = "human"

export default function PersonaSwitcher({
  personas,
  selected,
  onSelect,
  personaDetails,
}: PersonaSwitcherProps) {
  const { user } = useUser()
  
  return (
    <div className="flex flex-wrap gap-2">
      {personas.map((personaId) => {
        const detail = personaDetails[personaId]
        if (!detail) {
          return (
            <button
              key={personaId}
              onClick={() => onSelect(personaId)}
              className="px-3 py-2 rounded-lg border text-sm font-medium bg-muted text-muted-foreground cursor-not-allowed"
              disabled
            >
              <span className="text-base">👤</span>
              <span>Loading...</span>
            </button>
          )
        }
        
        const isSelected = selected === personaId
        const isHuman = personaId === HUMAN_PERSONA_ID

        return (
          <button
            key={personaId}
            onClick={() => onSelect(personaId)}
            className={`
              px-3 py-2 rounded-lg border text-sm font-medium transition-all
              flex items-center gap-2
              ${
                isSelected
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border/50 bg-background text-foreground hover:border-border'
              }
            `}
          >
            {isHuman && user?.imageUrl ? (
              <img 
                src={user.imageUrl} 
                alt={user.fullName || "You"} 
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <span className="text-base">{detail.avatar}</span>
            )}
            <span>{detail.name}</span>
          </button>
        )
      })}
    </div>
  )
}
