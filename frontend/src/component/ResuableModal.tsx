import { motion } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center backdrop-blur-xs bg-black/50 z-50"
      onClick={onClose} 
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="p-6 rounded-2xl w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()} 
      >
        <button
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
          onClick={onClose}
        >
          <X size={30} className="bg-black rounded-full p-1 text-white" />
        </button>
        {children}
      </motion.div>
    </div>
  );
};

export default Modal;
