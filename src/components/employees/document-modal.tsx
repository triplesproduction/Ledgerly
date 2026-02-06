import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FileText, Link, Plus, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface Document {
    id: string;
    name: string;
    url: string;
    type: 'link' | 'file';
    uploadedAt: string;
}

export function DocumentModal({ open, onOpenChange, employee, onSuccess }: any) {
    const [docs, setDocs] = useState<Document[]>(employee?.documents || []);
    const [newName, setNewName] = useState("");
    const [newUrl, setNewUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const newDoc: Document = {
            id: crypto.randomUUID(),
            name: newName,
            url: newUrl,
            type: 'link',
            uploadedAt: new Date().toISOString()
        };
        const updatedDocs = [...docs, newDoc];

        const { error } = await supabase
            .from('employees')
            .update({ documents: updatedDocs })
            .eq('id', employee.id);

        if (!error) {
            setDocs(updatedDocs);
            setNewName("");
            setNewUrl("");
            onSuccess(); // Refresh parent
        } else {
            alert("Failed to save document");
        }
        setIsSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Remove document?")) return;
        const updatedDocs = docs.filter(d => d.id !== id);
        const { error } = await supabase
            .from('employees')
            .update({ documents: updatedDocs })
            .eq('id', employee.id);

        if (!error) {
            setDocs(updatedDocs);
            onSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#121214] border-white/10 text-foreground sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Employee Documents</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    {/* Add Form */}
                    <form onSubmit={handleAdd} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3">
                        <Label className="text-xs uppercase tracking-wider text-zinc-400">Add New Document Link</Label>
                        <div className="grid gap-3">
                            <Input placeholder="Document Name (e.g. Resume)" value={newName} onChange={e => setNewName(e.target.value)} className="bg-black/20 border-white/10" required />
                            <Input placeholder="URL (e.g. Google Drive Link)" value={newUrl} onChange={e => setNewUrl(e.target.value)} className="bg-black/20 border-white/10" required />
                        </div>
                        <Button disabled={isSubmitting} size="sm" className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200">
                            <Plus className="w-4 h-4 mr-2" /> Add Document
                        </Button>
                    </form>

                    {/* List */}
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-zinc-500">Files on Record</Label>
                        {docs.length === 0 ? (
                            <div className="text-center py-8 text-zinc-600 text-sm">No documents attached.</div>
                        ) : (
                            <div className="grid gap-2">
                                {docs.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 group hover:border-white/10 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                                <Link className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-zinc-200 truncate">{doc.name}</p>
                                                <a href={doc.url} target="_blank" className="text-xs text-zinc-500 hover:text-blue-400 truncate block flex items-center hover:underline">
                                                    Open Link <ExternalLink className="h-3 w-3 ml-1" />
                                                </a>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(doc.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
