"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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

type Service = {
    id: string;
    name: string;
    type: string;
};

interface ServiceSelectorProps {
    value: string | null;
    onChange: (serviceId: string, serviceName: string) => void;
    disabled?: boolean;
    error?: string;
    className?: string;
}

export function ServiceSelector({
    value,
    onChange,
    disabled = false,
    error,
    className
}: ServiceSelectorProps) {
    const [open, setOpen] = useState(false)
    const [services, setServices] = useState<Service[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Fetch services from Supabase
    const fetchServices = async () => {
        setIsLoading(true)
        const { data, error: fetchError } = await supabase
            .from('services')
            .select('id, name, type')
            .eq('status', 'Active')
            .order('name', { ascending: true })

        if (!fetchError && data) {
            setServices(data)
        }
        setIsLoading(false)
    }

    // Initial fetch
    useEffect(() => {
        fetchServices()
    }, [])

    // Real-time subscription for service updates
    useEffect(() => {
        const subscription = supabase
            .channel('services_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, fetchServices)
            .subscribe()

        return () => {
            supabase.removeChannel(subscription)
        }
    }, [])

    // Find selected service
    const selectedService = services.find(service => service.id === value)

    return (
        <div className={cn("w-full", className)}>
            <Popover open={open} onOpenChange={setOpen} modal={true}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        disabled={disabled}
                        className={cn(
                            "w-full justify-between bg-white/5 border-white/10 text-foreground hover:bg-white/10 h-11",
                            !value && "text-muted-foreground",
                            error && "border-red-500"
                        )}
                    >
                        {isLoading ? (
                            "Loading services..."
                        ) : selectedService ? (
                            selectedService.name
                        ) : (
                            "Select service..."
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[250px] p-0 bg-[#121214] border-white/10" align="start">
                    <Command className="bg-transparent h-full">
                        <CommandInput
                            placeholder="Search services..."
                            className="h-9 bg-transparent border-none text-foreground placeholder:text-muted-foreground outline-none focus:outline-none focus:ring-0"
                        />
                        <CommandList className="max-h-[300px] overflow-y-auto overflow-x-hidden">
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                {isLoading ? "Loading..." : "No service found."}
                            </CommandEmpty>
                            <CommandGroup>
                                {services.map((service) => (
                                    <CommandItem
                                        key={service.id}
                                        value={service.name}
                                        onSelect={() => {
                                            onChange(service.id, service.name)
                                            setOpen(false)
                                        }}
                                        className="cursor-pointer text-foreground hover:bg-white/10"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === service.id ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{service.name}</span>
                                            <span className="text-xs text-muted-foreground">{service.type}</span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
            {error && (
                <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
        </div>
    )
}
