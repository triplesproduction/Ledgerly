"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { supabase } from "@/lib/supabase"

type Client = {
    id: string
    name: string
}

interface ClientSelectorProps {
    value?: string | null
    onChange: (id: string, name: string) => void
    className?: string
}

export function ClientSelector({ value, onChange, className }: ClientSelectorProps) {
    const [open, setOpen] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        const fetchClients = async () => {
            setLoading(true)
            const { data, error } = await supabase
                .from('clients')
                .select('id, name')
                .order('name')

            if (data) {
                setClients(data)
            }
            setLoading(false)
        }

        fetchClients()
    }, [])

    const selectedClient = clients.find((client) => client.id === value)

    const handleCreateClient = async () => {
        const trimmedSearch = search.trim()
        if (!trimmedSearch) return

        // Case-insensitive check
        const existingClient = clients.find(c => c.name.toLowerCase() === trimmedSearch.toLowerCase())

        if (existingClient) {
            onChange(existingClient.id, existingClient.name)
            setOpen(false)
            setSearch("")
            return
        }

        const { data, error } = await supabase
            .from('clients')
            .insert([{ name: trimmedSearch, status: 'Active' }])
            .select()
            .single()

        if (data) {
            setClients([...clients, data])
            onChange(data.id, data.name)
            setOpen(false)
            setSearch("")
        }
    }

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between bg-zinc-900/50 border-white/10 text-white hover:bg-zinc-900 hover:text-white h-11",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    {value
                        ? clients.find((client) => client.id === value)?.name
                        : "Select client..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0 bg-[#1c1c21] border-white/10 text-white z-[9999]" align="start" side="bottom">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder="Search or add client..."
                        value={search}
                        onValueChange={setSearch}
                        className="text-white"
                    />
                    <CommandList className="max-h-[220px] overflow-y-auto">
                        <CommandEmpty className="py-2 px-2">
                            {loading ? (
                                <p className="text-sm text-muted-foreground text-center">Loading...</p>
                            ) : (
                                <button
                                    onClick={handleCreateClient}
                                    className="flex items-center gap-2 text-sm text-orange-500 hover:text-orange-400 w-full justify-center py-2"
                                >
                                    <Plus size={14} />
                                    Create "{search}"
                                </button>
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {clients
                                .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
                                .map((client) => (
                                    <CommandItem
                                        key={client.id}
                                        value={client.name}
                                        onSelect={() => {
                                            onChange(client.id, client.name)
                                            setOpen(false)
                                        }}
                                        className="data-[selected=true]:bg-white/10 text-white"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === client.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {client.name}
                                    </CommandItem>
                                ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
