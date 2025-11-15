interface PersonaSwitcherProps {
  personas: string[]
  selected: string | null
  onSelect: (persona: string) => void
  personaDetails: any
}

export default function PersonaSwitcher({
  personas,
  selected,
  onSelect,
  personaDetails,
}: PersonaSwitcherProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {personas.map((personaId) => {
        const detail = personaDetails[personaId]
        const isSelected = selected === personaId

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
            <span className="text-base">{detail.avatar}</span>
            <span>{detail.name}</span>
          </button>
        )
      })}
    </div>
  )
}
